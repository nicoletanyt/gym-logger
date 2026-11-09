import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceKey);
if (url && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
    throw new Error("Integration tests only run against a disposable LOCAL Supabase stack, never a hosted project");
}

test("local Supabase: Auth, Data API permissions, snapshots, and concurrent writes", {
    skip: !configured && "Set TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, and TEST_SUPABASE_SERVICE_ROLE_KEY for a local stack",
}, async (t) => {
    const users = [];
    const password = `Local-test-${randomUUID()}!`;
    const request = async (path, { token = anonKey, key = anonKey, method = "GET", body } = {}) => {
        const response = await fetch(`${url.replace(/\/$/, "")}${path}`, {
            method,
            headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });
        const text = await response.text();
        return { status: response.status, ok: response.ok, data: text ? JSON.parse(text) : null };
    };
    const success = (result) => {
        assert.ok(result.ok, `HTTP ${result.status}: ${JSON.stringify(result.data)}`);
        return Array.isArray(result.data) ? result.data[0] : result.data;
    };
    const rpc = (name, body, token) => request(`/rest/v1/rpc/${name}`, { token, method: "POST", body });
    const provision = async () => {
        const email = `workout-${randomUUID()}@example.test`;
        // Real GoTrue users, confirmed locally without sending email. Service-role
        // credentials are used only for setup/cleanup, never the API assertions.
        const created = success(await request("/auth/v1/admin/users", {
            key: serviceKey, token: serviceKey, method: "POST", body: { email, password, email_confirm: true },
        }));
        users.push(created.id);
        return success(await request("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } }));
    };
    try {
        const a = await provision();
        const b = await provision();
        assert.ok(a.access_token && b.access_token);
        const exerciseId = randomUUID();
        const routineId = randomUUID();
        const sessionId = randomUUID();
        const exercise = { id: exerciseId, name: "Original curl", metricType: "weight" };
        const entry = { id: randomUUID(), exerciseId, metric: { type: "weight", sets: 3, reps: 10, weight: 12.5 } };
        const routine = { id: routineId, name: "Original routine", exercises: [entry] };
        const session = { id: sessionId, date: "2026-11-09", duration: 600, routineId, exercises: [entry] };
        success(await rpc("save_exercise", { p_exercise: exercise }, a.access_token));
        success(await rpc("save_routine", { p_routine: routine }, a.access_token));
        success(await rpc("save_session", { p_session: session }, a.access_token));

        await t.test("signed-out and foreign clients cannot read or mutate owned records", async () => {
            const anonymous = await request("/rest/v1/sessions?select=id");
            assert.equal(anonymous.ok, false);
            const foreign = await request(`/rest/v1/sessions?id=eq.${sessionId}&select=id`, { token: b.access_token });
            assert.ok(foreign.ok);
            assert.deepEqual(foreign.data, []);
            const denied = await rpc("save_session", { p_session: session, p_expected_revision: 1 }, b.access_token);
            assert.equal(denied.status, 409);
        });

        await t.test("table writes cannot bypass RPC validation", async () => {
            for (const table of ["exercises", "routines", "sessions", "session_exercises", "routine_exercises"]) {
                for (const method of ["POST", "PATCH", "DELETE"]) {
                    const denied = await request(`/rest/v1/${table}?id=eq.${sessionId}`, {
                        token: a.access_token, method, body: method === "DELETE" ? undefined : { id: sessionId },
                    });
                    assert.equal(denied.ok, false, `${method} ${table} should be denied`);
                    assert.equal(denied.data.code, "42501");
                }
            }
            const internal = await request("/rest/v1/rpc/lock_owner", { token: a.access_token, method: "POST", body: {} });
            assert.equal(internal.ok, false);
        });

        await t.test("concurrent same-revision saves have one winner and one conflict", async () => {
            const results = await Promise.all([
                rpc("save_session", { p_session: { ...session, duration: 700 }, p_expected_revision: 1 }, a.access_token),
                rpc("save_session", { p_session: { ...session, duration: 800 }, p_expected_revision: 1 }, a.access_token),
            ]);
            assert.equal(results.filter((r) => r.ok).length, 1);
            assert.equal(results.find((r) => !r.ok).status, 409);
            assert.equal(success(results.find((r) => r.ok)).revision, 2);
        });

        await t.test("renames and subsequent session edits keep historical names", async () => {
            success(await rpc("save_exercise", { p_exercise: { ...exercise, name: "Renamed curl" }, p_expected_revision: 1 }, a.access_token));
            success(await rpc("save_routine", { p_routine: { ...routine, name: "Renamed routine" }, p_expected_revision: 1 }, a.access_token));
            const edited = success(await rpc("save_session", { p_session: session, p_expected_revision: 2 }, a.access_token));
            assert.equal(edited.routine_name_snapshot, "Original routine");
            const entries = await request(`/rest/v1/session_exercises?session_id=eq.${sessionId}&select=exercise_name_snapshot`, { token: a.access_token });
            assert.equal(success(entries).exercise_name_snapshot, "Original curl");
        });

        await t.test("archive/save races never leave archived exercises in routines", async () => {
            const results = await Promise.all([
                rpc("save_routine", { p_routine: routine, p_expected_revision: 2 }, a.access_token),
                rpc("archive_exercises", { p_ids: [exerciseId] }, a.access_token),
            ]);
            assert.ok(results[1].ok);
            if (!results[0].ok) assert.equal(results[0].status, 409);
            const entries = await request(`/rest/v1/routine_exercises?routine_id=eq.${routineId}&select=id`, { token: a.access_token });
            assert.ok(entries.ok);
            assert.deepEqual(entries.data, []);
        });

        await t.test("stale edits cannot resurrect a deleted session", async () => {
            success(await rpc("delete_session", { p_id: sessionId, p_expected_revision: 3 }, a.access_token));
            const stale = await rpc("save_session", { p_session: session, p_expected_revision: 3 }, a.access_token);
            assert.equal(stale.status, 409);
            const sessions = await request(`/rest/v1/sessions?id=eq.${sessionId}&select=id`, { token: a.access_token });
            assert.ok(sessions.ok);
            assert.deepEqual(sessions.data, []);
        });
    } finally {
        // Delete only identities provisioned by this invocation. No blanket wipes.
        const results = await Promise.all(users.map((id) => request(`/auth/v1/admin/users/${id}`, {
            key: serviceKey, token: serviceKey, method: "DELETE",
        })));
        for (const result of results) assert.ok(result.ok, "Failed to clean up a local test identity");
    }
});
