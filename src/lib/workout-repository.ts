import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";
import type { Exercise, ExerciseEntry, ExerciseMetric } from "./Exercise.svelte";
import type { Routine } from "./Routine.svelte";
import type { Session } from "./Session.svelte";

type EntryRow = Tables<"routine_exercises"> | Tables<"session_exercises">;
export function mapEntry(row: EntryRow): ExerciseEntry {
    let metric: ExerciseMetric;
    switch (row.metric_type) {
        case "weight": metric = { type: "weight", sets: row.sets, weight: row.weight_kg!, reps: row.reps! }; break;
        case "reps": metric = { type: "reps", sets: row.sets, reps: row.reps! }; break;
        case "duration": metric = { type: "duration", sets: row.sets, duration: row.duration_minutes! }; break;
        case "cardio": metric = { type: "cardio", sets: row.sets, duration: row.duration_minutes!, distance: row.distance_km! }; break;
        default: throw new Error("Unrecognized exercise metric in saved data");
    }
    return {
        id: row.id, exerciseId: row.exercise_id, metric,
        ...("exercise_name_snapshot" in row ? { exerciseName: row.exercise_name_snapshot, avgDuration: row.avg_duration_seconds ?? undefined } : {}),
    };
}

export function mapExercise(row: Tables<"exercises">): Exercise {
    if (!["weight", "reps", "duration", "cardio"].includes(row.metric_type)) throw new Error("Unrecognized exercise type");
    return { id: row.id, name: row.name, metricType: row.metric_type as Exercise["metricType"], imageLink: row.image_link ?? "", note: row.note ?? "", archived: row.archived, revision: row.revision };
}
export function mapRoutine(row: Tables<"routines"> & { routine_exercises: Tables<"routine_exercises">[] }): Routine {
    return { id: row.id, name: row.name, revision: row.revision, exercises: row.routine_exercises.sort((a, b) => a.position - b.position).map(mapEntry) };
}
export function mapSession(row: Tables<"sessions"> & { session_exercises: Tables<"session_exercises">[] }): Session {
    return {
        id: row.id, date: row.workout_date, duration: row.duration_seconds, revision: row.revision,
        routineId: row.routine_id ?? "custom", routineName: row.routine_name_snapshot ?? undefined,
        startTime: row.started_at ? new Date(row.started_at) : undefined, createdAt: row.created_at, effort: row.effort ?? undefined,
        exercises: row.session_exercises.sort((a, b) => a.position - b.position).map(mapEntry),
    };
}

type Client = SupabaseClient<Database>;
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
async function allPages<T>(page: (start: number, end: number) => PageResult<T>): Promise<T[]> {
    const result: T[] = [];
    const size = 500;
    for (let start = 0; ; start += size) {
        const { data, error } = await page(start, start + size - 1);
        if (error) throw error;
        result.push(...(data ?? []));
        if (!data || data.length < size) return result;
    }
}

export async function fetchWorkouts(client: Client, userId: string, signal: AbortSignal = new AbortController().signal) {
    const [exercises, routines, sessions] = await Promise.all([
        allPages((start, end) => client.from("exercises").select("*").eq("user_id", userId).order("id").range(start, end).abortSignal(signal)),
        // Fetch parent revision and entries in the same statement so a concurrent
        // edit cannot pair a new revision with old entries.
        allPages((start, end) => client.from("routines").select("*, routine_exercises(*)").eq("user_id", userId).order("id").range(start, end).abortSignal(signal)),
        allPages((start, end) => client.from("sessions").select("*, session_exercises(*)").eq("user_id", userId).order("id").range(start, end).abortSignal(signal)),
    ]);
    return {
        exercises: exercises.map(mapExercise), routines: routines.map(mapRoutine),
        sessions: Object.fromEntries(sessions.map(mapSession).map((session) => [session.id, session])),
    };
}

export async function saveExercise(client: Client, value: Exercise, create = false) {
    if (!create && !value.revision) throw new Error("Reload this exercise before saving");
    const { error } = await client.rpc("save_exercise", {
        p_exercise: { id: value.id, name: value.name, metricType: value.metricType, imageLink: value.imageLink ?? "", note: value.note ?? "" },
        ...(!create ? { p_expected_revision: value.revision! } : {}),
    });
    if (error) throw error;
}
export async function saveRoutine(client: Client, value: Routine, create = false) {
    if (!create && !value.revision) throw new Error("Reload this routine before saving");
    const { error } = await client.rpc("save_routine", {
        p_routine: JSON.parse(JSON.stringify(value)), ...(!create ? { p_expected_revision: value.revision! } : {}),
    });
    if (error) throw error;
}
export async function saveSession(client: Client, value: Session, create = false) {
    if (!create && !value.revision) throw new Error("Reload this session before saving");
    const { error } = await client.rpc("save_session", {
        p_session: JSON.parse(JSON.stringify(value)), ...(!create ? { p_expected_revision: value.revision! } : {}),
    });
    if (error) throw error;
}
