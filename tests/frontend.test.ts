import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Tables, Database } from "../src/lib/database.types";
import type { Session } from "../src/lib/Session.svelte";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({ getAccountClient: vi.fn(), fetchWorkouts: vi.fn() }));
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("../src/lib/supabase", () => ({ getAccountClient: mocks.getAccountClient }));
vi.mock("../src/lib/workout-repository", async (original) => ({ ...await original<object>(), fetchWorkouts: mocks.fetchWorkouts }));

import { safeNext } from "../src/lib/auth";
import { cloud, cloudError, WORKOUT_LOAD_TIMEOUT_MS } from "../src/lib/cloud.svelte";
import { mapEntry, mapSession, saveSession } from "../src/lib/workout-repository";
import { compareSessions, sessionManager } from "../src/lib/Session.svelte";
import { parseImportText } from "../src/lib/importer";
import { libraryImages, MAX_IMAGE_SIZE, uploadExerciseImage, validateImage } from "../src/lib/exercise-images";

const empty = () => ({ exercises: [], routines: [], sessions: {} });
const session = (overrides: Partial<Session> = {}): Session => ({ id: "session-a", date: "2026-11-09", duration: 600, exercises: [], routineId: "custom", createdAt: "2026-11-09T12:00:00Z", ...overrides });
const entryRow: Tables<"session_exercises"> = {
    id: "entry-a", user_id: "user-a", session_id: "session-a", exercise_id: "exercise-a", position: 0,
    metric_type: "weight", sets: 3, reps: 10, weight_kg: 12.5, duration_minutes: null, distance_km: null,
    avg_duration_seconds: 42.5, exercise_name_snapshot: "Original name",
};

describe("exercise images", () => {
    it("validates image format and size", () => {
        expect(validateImage(new File(['image'], 'photo.jpg', { type: 'image/jpeg' }))).toBeNull();
        expect(validateImage(new File(['x'], 'bad.svg', { type: 'image/svg+xml' }))).toMatch(/JPEG/);
        expect(validateImage(new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], 'big.png', { type: 'image/png' }))).toMatch(/5 MB/);
        expect(libraryImages.length).toBeGreaterThan(0);
    });
    it("uploads under the owner's folder and propagates errors", async () => {
        const upload = vi.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('upload failed') });
        const client = { storage: { from: vi.fn().mockReturnValue({ upload }) } } as unknown as SupabaseClient<Database>;
        const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
        expect(await uploadExerciseImage(client, 'owner', file)).toMatch(/^storage:exercise-images\/owner\/.+\.jpg$/);
        expect(upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/jpeg', upsert: false });
        await expect(uploadExerciseImage(client, 'owner', file)).rejects.toThrow('upload failed');
    });
});

beforeEach(() => {
    cloud.clear(); vi.clearAllMocks();
    mocks.getAccountClient.mockResolvedValue({});
    mocks.fetchWorkouts.mockResolvedValue(empty());
});
afterEach(() => { vi.useRealTimers(); });

describe("safe auth redirects", () => {
    it.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "/foo/..//evil.example", "/auth/callback", "/sign-in", "/x\nLocation: evil"])("rejects %s", (value) => expect(safeNext(value)).toBe("/"));
    it("retains a relative destination and query", () => expect(safeNext("/sessions/abc?edit=1")).toBe("/sessions/abc?edit=1"));
    it("allows password recovery", () => expect(safeNext("/reset-password")).toBe("/reset-password"));
});

describe("database mappings", () => {
    it("preserves historical names and units", () => {
        expect(mapEntry(entryRow)).toEqual({ id: "entry-a", exerciseId: "exercise-a", exerciseName: "Original name", avgDuration: 42.5, metric: { type: "weight", sets: 3, weight: 12.5, reps: 10 } });
    });
    it("maps every metric variant", () => {
        expect(mapEntry({ ...entryRow, metric_type: "reps" }).metric).toEqual({ type: "reps", sets: 3, reps: 10 });
        expect(mapEntry({ ...entryRow, metric_type: "duration", duration_minutes: 0.5 }).metric).toEqual({ type: "duration", sets: 3, duration: 0.5 });
        expect(mapEntry({ ...entryRow, metric_type: "cardio", duration_minutes: 15, distance_km: 2.125 }).metric).toEqual({ type: "cardio", sets: 3, duration: 15, distance: 2.125 });
    });
    it("retains revisions, nullable routines, dates and ordered entries", () => {
        const mapped = mapSession({ id: "session-a", user_id: "user-a", duration_seconds: 600, workout_date: "2026-11-09", revision: 4, routine_id: null, routine_name_snapshot: "Deleted routine", started_at: null, effort: null, created_at: "2026-11-10T00:00:00Z", updated_at: "2026-11-10T00:00:00Z", session_exercises: [{ ...entryRow, id: "second", position: 1 }, entryRow] });
        expect(mapped.routineId).toBe("custom"); expect(mapped.routineName).toBe("Deleted routine");
        expect(mapped.revision).toBe(4); expect(mapped.startTime).toBeUndefined();
        expect(mapped.exercises.map((entry) => entry.id)).toEqual(["entry-a", "second"]);
    });
    it("orders actual start times before record-creation fallbacks", () => {
        const values = [session({ id: "unknown", createdAt: "2026-11-10T00:00:00Z" }), session({ id: "early", startTime: new Date("2026-11-09T09:00:00Z") }), session({ id: "late", startTime: new Date("2026-11-09T17:00:00Z") })];
        expect(values.sort(compareSessions).map((item) => item.id)).toEqual(["late", "early", "unknown"]);
    });
    it("keeps routine targets when the exercise has no previous workout", () => {
        cloud.data.routines = [{ id: "routine-a", name: "Routine", revision: 1, exercises: [mapEntry(entryRow)] }];
        const draft = session({ routineId: "routine-a" });
        sessionManager.applyRoutine(draft);
        expect(draft.exercises[0].metric).toEqual({ type: "weight", sets: 3, weight: 12.5, reps: 10 });
        expect(draft.exercises[0].id).not.toBe(entryRow.id);
    });
    it("never silently updates without the draft's original revision", async () => {
        const rpc = vi.fn().mockResolvedValue({ error: null });
        const client = { rpc } as unknown as SupabaseClient<Database>;
        await expect(saveSession(client, session())).rejects.toThrow("Reload");
        expect(rpc).not.toHaveBeenCalled();
        await saveSession(client, session({ revision: 3 }));
        expect(rpc).toHaveBeenCalledWith("save_session", expect.objectContaining({ p_expected_revision: 3 }));
        await saveSession(client, session(), true);
        expect(rpc.mock.calls[1][1]).not.toHaveProperty("p_expected_revision");
    });
});

describe("existing text import format", () => {
    it("keeps session duration in seconds and exercise values in their own units", () => {
        const [parsed] = parseImportText("9/8 Bicep curl 12.5kg x10, 3 sets\nduration: 30mins", 2026);
        expect(parsed.date).toBe("2026-08-09");
        expect(parsed.duration).toBe(1800);
        expect(parsed.exercises[0].metric).toEqual({ type: "weight", sets: 3, reps: 10, weight: 12.5 });
    });
    it("retains multiple imported sessions on the same day", () => {
        const parsed = parseImportText("9/8 Bicep curl 12kg x10, 3 sets\nduration: 30mins\n9/8 Run 8km/h for 15mins\nduration: 20mins", 2026);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].date).toBe(parsed[1].date);
    });
});

describe("cloud state", () => {
    it("retries an unsuccessful load when the verified account ID is unchanged", async () => {
        mocks.fetchWorkouts.mockRejectedValueOnce(new Error("Read failed"));
        await cloud.setUser("user-a");
        expect(cloud.ready).toBe(false);
        expect(cloud.loading).toBe(false);
        await cloud.setUser("user-a");
        expect(cloud.ready).toBe(true);
        expect(cloud.error).toBe("");
        expect(mocks.fetchWorkouts).toHaveBeenCalledTimes(2);
    });
    it("does not clear or refetch data on repeated same-user notifications", async () => {
        await cloud.setUser("user-a");
        const loaded = cloud.data;
        await cloud.setUser("user-a");
        expect(cloud.data).toBe(loaded);
        expect(cloud.ready).toBe(true);
        expect(mocks.fetchWorkouts).toHaveBeenCalledTimes(1);
    });
    it("deduplicates same-user notifications while a read is in flight", async () => {
        let resolve!: (value: ReturnType<typeof empty>) => void;
        mocks.fetchWorkouts.mockReturnValueOnce(new Promise((done) => resolve = done));
        const pending = cloud.setUser("user-a");
        await vi.waitFor(() => expect(mocks.fetchWorkouts).toHaveBeenCalledTimes(1));
        await cloud.setUser("user-a");
        expect(mocks.fetchWorkouts).toHaveBeenCalledTimes(1);
        resolve(empty()); await pending;
        expect(cloud.ready).toBe(true);
    });
    it("bounds a stalled session lookup and discards its late completion", async () => {
        vi.useFakeTimers();
        let resolve!: (client: object) => void;
        mocks.getAccountClient.mockReturnValueOnce(new Promise((done) => resolve = done));
        const loading = cloud.setUser("user-a");
        await vi.advanceTimersByTimeAsync(WORKOUT_LOAD_TIMEOUT_MS);
        await loading;
        expect(cloud.loading).toBe(false);
        expect(cloud.ready).toBe(false);
        expect(cloud.error).toContain("timed out");
        resolve({});
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.fetchWorkouts).not.toHaveBeenCalled();
        await cloud.setUser("user-a");
        expect(cloud.ready).toBe(true);
    });
    it("aborts stalled workout requests and allows a fresh load after the deadline", async () => {
        vi.useFakeTimers();
        mocks.fetchWorkouts.mockReturnValueOnce(new Promise(() => {}));
        const loading = cloud.setUser("user-a");
        await vi.advanceTimersByTimeAsync(0);
        const signal = mocks.fetchWorkouts.mock.calls[0][2] as AbortSignal;
        await vi.advanceTimersByTimeAsync(WORKOUT_LOAD_TIMEOUT_MS);
        await loading;
        expect(signal.aborted).toBe(true);
        expect(cloud.loading).toBe(false);
        expect(cloud.error).toContain("timed out");
        await cloud.setUser("user-a");
        expect(cloud.ready).toBe(true);
    });
    it("rejects writes before authenticated data is loaded", async () => {
        const operation = vi.fn();
        expect((await cloud.mutate(operation)).success).toBe(false);
        expect(operation).not.toHaveBeenCalled();
    });
    it("keeps loaded data unchanged on a revision conflict", async () => {
        await cloud.setUser("user-a"); const previous = cloud.data;
        expect((await cloud.mutate(async () => { throw { code: "PT409" }; })).success).toBe(false);
        expect(cloud.data).toBe(previous); expect(cloud.error).toContain("draft was not saved");
        expect(cloud.saving).toBe(false);
    });
    it("does not report an acknowledged write as failed when refresh fails", async () => {
        await cloud.setUser("user-a"); mocks.fetchWorkouts.mockRejectedValueOnce(new Error("network"));
        expect((await cloud.mutate(async () => {})).success).toBe(true);
        expect(cloud.needsReload).toBe(true); expect(cloud.error).toContain("was saved");
        expect((await cloud.mutate(async () => {})).success).toBe(false);
        await cloud.reload(); expect(cloud.needsReload).toBe(false);
    });
    it("discards an old account's in-flight load after sign-out", async () => {
        let resolve!: (value: ReturnType<typeof empty>) => void;
        mocks.fetchWorkouts.mockReturnValueOnce(new Promise((done) => resolve = done));
        const loading = cloud.setUser("user-a");
        await vi.waitFor(() => expect(mocks.fetchWorkouts).toHaveBeenCalled());
        cloud.clear(); resolve(empty()); await loading;
        expect(cloud.ownerId).toBeNull(); expect(cloud.ready).toBe(false);
    });
    it("discards old mutation results after switching accounts", async () => {
        await cloud.setUser("user-a"); let resolve!: () => void;
        const pending = cloud.mutate(() => new Promise<void>((done) => resolve = done));
        await vi.waitFor(() => expect(cloud.saving).toBe(true));
        await cloud.setUser("user-b"); resolve();
        expect((await pending).success).toBe(false);
        expect(cloud.ownerId).toBe("user-b"); expect(cloud.ready).toBe(true);
    });
    it("prevents double submissions", async () => {
        await cloud.setUser("user-a"); let resolve!: () => void;
        const pending = cloud.mutate(() => new Promise<void>((done) => resolve = done));
        await vi.waitFor(() => expect(cloud.saving).toBe(true));
        const duplicate = vi.fn(); expect((await cloud.mutate(duplicate)).success).toBe(false);
        expect(duplicate).not.toHaveBeenCalled(); resolve(); await pending;
    });
    it("warns that a network-interrupted write may have committed", () => expect(cloudError(new Error("Failed to fetch"))).toContain("may have completed"));
});
