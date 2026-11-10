import { v5 as uuidv5 } from "uuid";
import { cloud } from "./cloud.svelte";
import type { Exercise, ExerciseEntry } from "./Exercise.svelte";
import type { Routine } from "./Routine.svelte";
import type { Session } from "./Session.svelte";
import { STORAGE_KEYS } from "./constants";
import { STORAGE_PREFIX } from "./exercise-images";
import { saveExercise, saveRoutine, saveSession } from "./workout-repository";

type WorkoutData = { exercises: Exercise[]; routines: Routine[]; sessions: Record<string, Session> };
export type Backup = WorkoutData & { source: "cloud" | "local"; warnings: string[] };
export type ImportResult = { exercises: number; routines: number; sessions: number; skipped: number; imagesOmitted: number };
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export function createLocalBackup(storage: Pick<Storage, "getItem">) {
    return { version: "legacy-local", ...Object.fromEntries(Object.entries(STORAGE_KEYS).map(([name, key]) => {
        const value = storage.getItem(key);
        return [name, value === null ? null : JSON.parse(value)];
    })) };
}

export function createCloudBackup(data: WorkoutData) {
    return { version: 1, exportedAt: new Date().toISOString(), ...data };
}

export function downloadBackup(value: unknown, filename: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Leave the URL alive until the browser has started reading the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const object = (value: unknown): value is Record<string, any> => typeof value === "object" && value !== null && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const positive = (value: unknown, max = 9999999.999): value is number => typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
const integer = (value: unknown) => positive(value, 2147483647) && Number.isInteger(value);
const name = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 200;
const timestamp = (value: unknown) => value === undefined || (typeof value === "string" && Number.isFinite(Date.parse(value)));

export function parseBackup(text: string): Backup {
    let data: unknown;
    try { data = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { throw new Error("This file is not valid JSON."); }
    if (!object(data) || (data.version !== 1 && data.version !== "legacy-local")) throw new Error("Choose a Gym Logger cloud or previous browser-data backup exported from Profile.");
    const legacy = data.version === "legacy-local";
    const warnings: string[] = [];
    if (legacy) {
        const raw = data.sessions ?? {};
        if ((!object(raw) && !Array.isArray(raw)) || !Array.isArray(data.exercises ?? []) || !Array.isArray(data.routines ?? [])) throw new Error("The previous browser-data backup has an invalid structure.");
        const normalized: Record<string, unknown> = {};
        const reserved = new Set(Object.values(raw).filter(object).map((session) => session.id));
        const routines = new Set((data.routines ?? []).filter(object).map((routine: Record<string, any>) => routine.id));
        for (const [key, original] of Object.entries(raw)) {
            if (!object(original) || !uuid(original.id)) throw new Error("The previous browser-data backup contains an invalid session ID.");
            const session = { ...original };
            if (Object.hasOwn(normalized, session.id)) {
                session.id = uuidv5(`legacy-session:${key}`, original.id);
                if (reserved.has(session.id) || Object.hasOwn(normalized, session.id)) throw new Error("The backup contains conflicting session IDs.");
                warnings.push(`Session ${session.date} had a duplicate ID; a stable unique ID was assigned.`);
            }
            if (uuid(session.routineId) && !routines.has(session.routineId)) {
                session.routineId = "custom";
                warnings.push(`Session ${session.date} refers to a deleted routine and will be imported as custom.`);
            }
            normalized[session.id] = session;
        }
        data = { exercises: data.exercises ?? [], routines: data.routines ?? [], sessions: normalized };
    }
    if (!object(data) || !Array.isArray(data.exercises) || !Array.isArray(data.routines) || !object(data.sessions)) throw new Error("The backup has an invalid structure.");
    const exerciseIds = new Set<string>();
    const routineIds = new Set<string>();
    for (const exercise of data.exercises) {
        if (!object(exercise) || !uuid(exercise.id) || exerciseIds.has(exercise.id) || !name(exercise.name) || !["weight", "reps", "duration", "cardio"].includes(exercise.metricType) || (exercise.note !== undefined && typeof exercise.note !== "string") || (exercise.imageLink !== undefined && typeof exercise.imageLink !== "string") || (exercise.archived !== undefined && typeof exercise.archived !== "boolean")) throw new Error("The backup contains an invalid or duplicate exercise.");
        exerciseIds.add(exercise.id);
    }
    function validateEntries(entries: unknown, label: string, parent: string, allowEmpty = false) {
        if (!Array.isArray(entries) || (!allowEmpty && entries.length === 0)) throw new Error(`${label} must contain exercises.`);
        const ids = new Set<string>();
        for (const [index, entry] of entries.entries()) {
            const location = `${label}, exercise ${index + 1}`;
            if (!object(entry)) throw new Error(`${location} is not a valid exercise entry.`);
            if (legacy && (entry.id === undefined || entry.id === null)) entry.id = uuidv5(`legacy-entry:${index}`, parent);
            if (!uuid(entry.id) || ids.has(entry.id)) throw new Error(`${location} has an invalid or duplicate entry ID.`);
            if (!uuid(entry.exerciseId) || !exerciseIds.has(entry.exerciseId)) throw new Error(`${location} references an exercise missing from the backup (${entry.exerciseId}).`);
            if (!object(entry.metric)) throw new Error(`${location} is missing exercise metrics.`);
            ids.add(entry.id);
            const m = entry.metric;
            if (!integer(m.sets) || !["weight", "reps", "duration", "cardio"].includes(m.type) || ((m.type === "weight" || m.type === "reps") && !integer(m.reps)) || (m.type === "weight" && !positive(m.weight)) || ((m.type === "duration" || m.type === "cardio") && !positive(m.duration)) || (m.type === "cardio" && !positive(m.distance)) || (entry.avgDuration !== undefined && (typeof entry.avgDuration !== "number" || !Number.isFinite(entry.avgDuration) || entry.avgDuration < 0 || entry.avgDuration > 999999999.999))) throw new Error(`${location} contains invalid exercise metrics.`);
        }
    }
    for (const routine of data.routines) {
        if (!object(routine) || !uuid(routine.id) || routineIds.has(routine.id) || !name(routine.name)) throw new Error("The backup contains an invalid or duplicate routine.");
        routineIds.add(routine.id);
        validateEntries(routine.exercises, `Routine ${routine.name}`, routine.id, true);
    }
    for (const [key, session] of Object.entries(data.sessions)) {
        if (!object(session) || !uuid(session.id) || key !== session.id || typeof session.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !Number.isFinite(Date.parse(`${session.date}T00:00:00Z`)) || new Date(`${session.date}T00:00:00Z`).toISOString().slice(0, 10) !== session.date || !integer(session.duration) || (session.routineId !== "custom" && (!uuid(session.routineId) || !routineIds.has(session.routineId))) || !timestamp(session.startTime) || !timestamp(session.createdAt) || (session.effort !== undefined && (!Number.isInteger(session.effort) || session.effort < 1 || session.effort > 5))) throw new Error(`The backup contains an invalid session (${key}).`);
        validateEntries(session.exercises, `Session ${session.date}`, session.id);
    }
    return { exercises: data.exercises, routines: data.routines, sessions: data.sessions, source: legacy ? "local" : "cloud", warnings } as Backup;
}

export async function importBackup(backup: Backup): Promise<ImportResult> {
    if (!cloud.ready || !cloud.ownerId || cloud.loading || cloud.saving || cloud.needsReload) throw new Error("Load your workouts before importing.");
    const owner = cloud.ownerId;
    const result: ImportResult = { exercises: 0, routines: 0, sessions: 0, skipped: 0, imagesOmitted: 0 };
    const existingExercises = new Map(cloud.data.exercises.map((item) => [item.id, item]));
    const existingRoutines = new Set(cloud.data.routines.map((item) => item.id));
    const existingSessions = new Set(Object.keys(cloud.data.sessions));
    const incomingExercises = new Map(backup.exercises.map((item) => [item.id, item]));
    for (const routine of backup.routines.filter((item) => !existingRoutines.has(item.id))) {
        if (routine.exercises.some((entry: ExerciseEntry) => (existingExercises.get(entry.exerciseId) ?? incomingExercises.get(entry.exerciseId))?.archived)) throw new Error(`Routine ${routine.name} uses an archived exercise and cannot be imported until that exercise is active.`);
    }
    async function save(operation: Parameters<typeof cloud.mutate>[0], onSaved: () => void) {
        if (cloud.ownerId !== owner) throw new Error("Your account changed during import.");
        const outcome = await cloud.mutate(operation);
        if (!outcome.success) throw new Error(outcome.message);
        onSaved();
        if (cloud.needsReload) throw new Error("The last record was saved, but the updated data could not be loaded.");
    }
    try {
        for (const exercise of backup.exercises) {
            if (existingExercises.has(exercise.id)) { result.skipped++; continue; }
            const value = { ...exercise };
            if (value.imageLink?.startsWith(STORAGE_PREFIX) && !value.imageLink.slice(STORAGE_PREFIX.length).startsWith(`${owner}/`)) { value.imageLink = ""; result.imagesOmitted++; }
            await save((client) => saveExercise(client, value, true), () => result.exercises++);
            // Archive immediately so an interrupted import cannot leave these active.
            if (exercise.archived) await save(async (client) => { const { error } = await client.rpc("archive_exercises", { p_ids: [exercise.id] }); if (error) throw error; }, () => {});
        }
        for (const routine of backup.routines) {
            if (existingRoutines.has(routine.id)) { result.skipped++; continue; }
            await save((client) => saveRoutine(client, routine, true), () => result.routines++);
        }
        for (const session of Object.values(backup.sessions)) {
            if (existingSessions.has(session.id)) { result.skipped++; continue; }
            await save((client) => saveSession(client, session, true), () => result.sessions++);
        }
    } catch (error) {
        throw new Error(`Import stopped after adding ${result.exercises} exercises, ${result.routines} routines and ${result.sessions} sessions. ${error instanceof Error ? error.message : "Could not save."} Reload before retrying; existing records will be skipped. Check archived exercise status after a partial import.`);
    }
    return result;
}
