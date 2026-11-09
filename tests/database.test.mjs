import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { Client } from "pg";

// Real PostgreSQL in WASM; no Docker, network, keys, or live accounts required.
// Only auth.users/auth.uid() are stand-ins for Supabase's managed Auth schema.
const postgresUrl = process.env.TEST_POSTGRES_URL;
if (postgresUrl && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(postgresUrl).hostname)) {
    throw new Error("TEST_POSTGRES_URL must point to a disposable loopback PostgreSQL database");
}
const nativeClient = postgresUrl ? new Client({ connectionString: postgresUrl }) : null;
const db = nativeClient ? {
    query: (sql, params) => nativeClient.query(sql, params),
    exec: (sql) => nativeClient.query(sql),
    close: () => nativeClient.end(),
} : new PGlite();
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const EA = "10000000-0000-4000-8000-000000000001";
const EB = "10000000-0000-4000-8000-000000000002";
const RA = "20000000-0000-4000-8000-000000000001";
const RB = "20000000-0000-4000-8000-000000000002";
const SA = "30000000-0000-4000-8000-000000000001";
const SB = "30000000-0000-4000-8000-000000000002";
const SECOND = "30000000-0000-4000-8000-000000000003";
const ENTRY = "40000000-0000-4000-8000-000000000001";
const OTHER_ENTRY = "40000000-0000-4000-8000-000000000002";

const entry = (overrides = {}) => ({
    id: ENTRY,
    exerciseId: EA,
    metric: { type: "weight", sets: 3, reps: 10, weight: 12.5 },
    ...overrides,
});
const session = (overrides = {}) => ({
    id: SA,
    date: "2026-11-09",
    duration: 1800,
    routineId: RA,
    exercises: [entry()],
    ...overrides,
});
const routine = (overrides = {}) => ({ id: RA, name: "Updated routine", exercises: [entry()], ...overrides });
const saveSession = (value, revision = value?.id === SA ? 1 : null) => db.query("select * from public.save_session($1::jsonb, $2)", [JSON.stringify(value), revision]);
const saveRoutine = (value, revision = value?.id === RA ? 1 : null) => db.query("select * from public.save_routine($1::jsonb, $2)", [JSON.stringify(value), revision]);
const saveExercise = (value, revision = value?.id === EA ? 1 : null) => db.query("select * from public.save_exercise($1::jsonb, $2)", [JSON.stringify(value), revision]);
const deleteSession = (id, revision = 1) => db.query("select public.delete_session($1, $2)", [id, revision]);
const deleteRoutine = (id, revision = 1) => db.query("select public.delete_routine($1, $2)", [id, revision]);
const archive = (ids) => db.query("select public.archive_exercises($1::uuid[])", [ids]);
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;

async function asUser(id, role = "authenticated") {
    // role is always a hardcoded test role, not user input.
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id ?? ""]);
}

async function fails(operation, code) {
    await db.exec("savepoint expected_error");
    try {
        await assert.rejects(async () => {
            await operation();
            // PostgREST commits each RPC; force commit-time FKs here because
            // test fixtures deliberately live in a transaction we roll back.
            await db.exec("set constraints all immediate");
        }, (error) => {
            assert.equal(error.code, code, error.message);
            return true;
        });
    } finally {
        await db.exec("rollback to savepoint expected_error; release savepoint expected_error");
    }
}

before(async () => {
    if (nativeClient) {
        await nativeClient.connect();
        const existing = await rows("select count(*)::integer as count from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p')");
        assert.equal(existing[0].count, 0, "Native tests require an empty disposable database");
    }
    await db.exec(`
        create role anon nologin;
        create role authenticated nologin;
        create schema auth;
        create table auth.users (id uuid primary key);
        create function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
        $$;
        grant usage on schema auth, public to anon, authenticated;
        grant execute on function auth.uid() to anon, authenticated;
    `);
    const migrations = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(migrations)).filter((file) => file.endsWith(".sql")).sort()) {
        await db.exec(await readFile(new URL(file, migrations), "utf8"));
    }
});

beforeEach(async (context) => {
    await db.exec("begin");
    await db.exec(`
        insert into auth.users (id) values ('${A}'), ('${B}');
        insert into public.exercises (id, user_id, name, metric_type) values
            ('${EA}', '${A}', 'Dumbbell curl', 'weight'), ('${EB}', '${B}', 'Private exercise', 'weight');
        insert into public.routines (id, user_id, name) values
            ('${RA}', '${A}', 'My routine'), ('${RB}', '${B}', 'Private routine');
        insert into public.sessions (id, user_id, workout_date, duration_seconds, routine_id, routine_name_snapshot) values
            ('${SA}', '${A}', '2026-11-09', 600, '${RA}', 'My routine'),
            ('${SB}', '${B}', '2026-11-09', 1200, '${RB}', 'Private routine');
        insert into public.routine_exercises (id, user_id, routine_id, exercise_id, position, metric_type, sets, reps, weight_kg) values
            ('${ENTRY}', '${A}', '${RA}', '${EA}', 0, 'weight', 2, 8, 10),
            ('${ENTRY}', '${B}', '${RB}', '${EB}', 0, 'weight', 2, 8, 10);
        insert into public.session_exercises (id, user_id, session_id, exercise_id, position, metric_type, sets, reps, weight_kg, exercise_name_snapshot) values
            ('${ENTRY}', '${A}', '${SA}', '${EA}', 0, 'weight', 2, 8, 10, 'Dumbbell curl'),
            ('${ENTRY}', '${B}', '${SB}', '${EB}', 0, 'weight', 2, 8, 10, 'Private exercise');
    `);
    await asUser(A);
    if (context.name.startsWith("concurrency:")) await db.exec("commit");
});
afterEach(async (context) => {
    if (context.name.startsWith("concurrency:")) {
        // Concurrent connections need committed fixtures, unlike the fast tests.
        if (nativeClient) await db.query("delete from auth.users where id in ($1, $2)", [A, B]);
        else await db.exec("rollback");
        return;
    }
    try {
        await db.exec("set constraints all immediate");
    } finally {
        await db.exec("rollback");
    }
});
after(async () => { await db.close(); });

test("all tables hide another account's rows, including child records", async () => {
    for (const table of ["exercises", "routines", "sessions", "routine_exercises", "session_exercises"]) {
        assert.deepEqual((await rows(`select user_id from public.${table}`)).map((row) => row.user_id), [A]);
    }
});

test("anonymous clients have no table or RPC access", async () => {
    await asUser(null, "anon");
    for (const table of ["exercises", "routines", "sessions", "routine_exercises", "session_exercises"]) {
        await fails(() => db.query(`select * from public.${table}`), "42501");
    }
    await fails(() => saveSession(session()), "42501");
    await fails(() => saveRoutine(routine()), "42501");
    await fails(() => saveExercise({ id: EA, name: "Forged", metricType: "weight" }), "42501");
    await fails(() => deleteSession(SA), "42501");
    await fails(() => deleteRoutine(RA), "42501");
    await fails(() => db.query("select public.archive_exercises($1::uuid[])", [[EA]]), "42501");
});

test("authenticated role without a user ID cannot see or save data", async () => {
    await asUser(null);
    assert.equal((await rows("select * from public.sessions")).length, 0);
    await fails(() => saveSession(session()), "42501");
    await fails(() => saveRoutine(routine()), "42501");
    await fails(() => saveExercise({ id: EA, name: "Forged", metricType: "weight" }), "42501");
    await fails(() => deleteSession(SA), "42501");
    await fails(() => deleteRoutine(RA), "42501");
    await fails(() => db.query("select public.archive_exercises($1::uuid[])", [[EA]]), "42501");
});

test("exercise RPC derives ownership and ignores client-owned identity and timestamps", async () => {
    const created = (await saveExercise({ id: SECOND, name: "Squat", metricType: "weight", user_id: B, updated_at: "2000-01-01" })).rows;
    assert.equal(created[0].user_id, A);
    assert.equal(created[0].revision, 1);
    assert.notEqual(created[0].updated_at.toISOString(), "2000-01-01T00:00:00.000Z");
});

test("foreign records cannot be changed or deleted by privileged RPCs", async () => {
    await fails(() => saveSession(session({ id: SB, routineId: "custom" }), 1), "PT409");
    await fails(() => saveRoutine(routine({ id: RB }), 1), "PT409");
    await fails(() => saveExercise({ id: EB, name: "Forged", metricType: "weight" }, 1), "PT409");
    await fails(() => deleteSession(SB), "PT409");
    await fails(() => deleteRoutine(RB), "PT409");
    await asUser(B);
    assert.equal((await rows("select duration_seconds from public.sessions where id = $1", [SB]))[0].duration_seconds, 1200);
});

test("clients cannot bypass the write API on any table, even for their own rows", async () => {
    for (const table of ["exercises", "routines", "sessions", "routine_exercises", "session_exercises"]) {
        await fails(() => db.query(`insert into public.${table} default values`), "42501");
        await fails(() => db.query(`update public.${table} set user_id = user_id`), "42501");
        await fails(() => db.query(`delete from public.${table}`), "42501");
        await fails(() => db.query(`truncate public.${table} cascade`), "42501");
    }
});

test("same-day sessions and copied entry IDs remain independent", async () => {
    await saveSession(session({ id: SECOND }));
    assert.equal((await rows("select id from public.sessions where workout_date = '2026-11-09'")).length, 2);
    assert.equal((await rows("select id from public.session_exercises where id = $1", [ENTRY])).length, 2);
    await deleteSession(SECOND);
    assert.equal((await rows("select id from public.session_exercises where session_id = $1", [SA])).length, 1);
});

test("session saves replace ordered entries and stale retries conflict without duplication", async () => {
    const value = session({ exercises: [entry({ id: OTHER_ENTRY }), entry({ metric: { type: "reps", sets: 1, reps: 12 } })] });
    const [saved] = (await saveSession(value)).rows;
    assert.equal(saved.revision, 2);
    await fails(() => saveSession(value), "PT409");
    const entries = await rows("select id, position from public.session_exercises where session_id = $1 order by position", [SA]);
    assert.deepEqual(entries, [{ id: OTHER_ENTRY, position: 0 }, { id: ENTRY, position: 1 }]);
    assert.equal((await rows("select duration_seconds from public.sessions where id = $1", [SA]))[0].duration_seconds, 1800);
});

test("failed session save rolls back parent updates and replacement entries", async () => {
    await fails(() => saveSession(session({ exercises: [entry({ metric: { type: "weight", sets: 0, weight: 12, reps: 10 } })] })), "23514");
    assert.equal((await rows("select duration_seconds from public.sessions where id = $1", [SA]))[0].duration_seconds, 600);
    assert.equal((await rows("select sets from public.session_exercises where session_id = $1", [SA]))[0].sets, 2);
    await fails(() => saveSession(session({ id: SECOND, exercises: [entry({ exerciseId: EB })] })), "22023");
    assert.equal((await rows("select id from public.sessions where id = $1", [SECOND])).length, 0);
});

test("cross-user routine references are rejected", async () => {
    await fails(() => saveSession(session({ routineId: RB })), "22023");
});

test("routine saves replace entries atomically and reject foreign exercises", async () => {
    await saveRoutine(routine());
    await saveRoutine(routine(), 2);
    assert.equal((await rows("select * from public.routine_exercises where routine_id = $1", [RA])).length, 1);
    await fails(() => saveRoutine(routine({ name: "Should roll back", exercises: [entry({ exerciseId: EB })] }), 3), "22023");
    assert.equal((await rows("select name from public.routines where id = $1", [RA]))[0].name, "Updated routine");
    assert.equal((await rows("select sets from public.routine_exercises where routine_id = $1", [RA]))[0].sets, 3);
});

test("routine deletion keeps sessions, clears only routine_id, and cascades template entries", async () => {
    await deleteRoutine(RA);
    const [saved] = await rows("select user_id, routine_id, revision, routine_name_snapshot from public.sessions where id = $1", [SA]);
    assert.deepEqual(saved, { user_id: A, routine_id: null, revision: 2, routine_name_snapshot: "My routine" });
    assert.equal((await rows("select * from public.routine_exercises")).length, 0);
    assert.equal((await rows("select * from public.session_exercises")).length, 1);
});

test("archiving removes template entries but preserves history and ignores foreign IDs", async () => {
    await db.query("select public.archive_exercises($1::uuid[])", [[EA, EB]]);
    assert.equal((await rows("select archived from public.exercises where id = $1", [EA]))[0].archived, true);
    assert.equal((await rows("select * from public.routine_exercises")).length, 0);
    assert.equal((await rows("select * from public.session_exercises")).length, 1);
    await fails(() => db.query("delete from public.exercises where id = $1", [EA]), "42501");
    await asUser(B);
    assert.equal((await rows("select archived from public.exercises where id = $1", [EB]))[0].archived, false);
    assert.equal((await rows("select * from public.routine_exercises")).length, 1);
});

test("account deletion cleans up owned records without touching another account", async () => {
    await db.exec("reset role");
    await db.query("delete from auth.users where id = $1", [A]);
    for (const table of ["exercises", "routines", "sessions", "routine_exercises", "session_exercises"]) {
        assert.deepEqual((await rows(`select user_id from public.${table}`)).map((row) => row.user_id), [B]);
    }
});

test("all metric variants retain their units and decimal precision", async () => {
    const metrics = [
        { type: "weight", sets: 3, weight: 12.125, reps: 8 },
        { type: "reps", sets: 2, reps: 20 },
        { type: "duration", sets: 1, duration: 0.5 },
        { type: "cardio", sets: 1, duration: 15, distance: 2.125 },
    ];
    let revision = 1;
    for (const metric of metrics) {
        await saveSession(session({ exercises: [entry({ metric, avgDuration: 1.25 })] }), revision++);
        const [saved] = await rows("select * from public.session_exercises where session_id = $1", [SA]);
        assert.equal(saved.metric_type, metric.type);
        assert.equal(saved.sets, metric.sets);
        assert.equal(Number(saved.avg_duration_seconds), 1.25);
        if ("weight" in metric) assert.equal(Number(saved.weight_kg), metric.weight);
        if ("duration" in metric) assert.equal(Number(saved.duration_minutes), metric.duration);
        if ("distance" in metric) assert.equal(Number(saved.distance_km), metric.distance);
    }
});

test("invalid metrics are rejected for both sessions and routines", async () => {
    for (const metric of [
        { type: "bogus", sets: 1, reps: 10 },
        { type: "reps", sets: 1, reps: -1 },
        { type: "weight", sets: 1, reps: 10 },
        { type: "cardio", sets: 1, duration: 10 },
        { type: "reps", sets: 1, reps: 10, weight: 12 },
        { type: "duration", sets: 1, duration: "NaN" },
        { type: "weight", sets: 1, weight: 0, reps: 10 },
    ]) {
        await fails(() => saveSession(session({ exercises: [entry({ metric })] })), "23514");
        await fails(() => saveRoutine(routine({ exercises: [entry({ metric })] })), "23514");
    }
});

test("invalid names, duration, effort, and non-finite dates are rejected", async () => {
    await fails(() => saveRoutine(routine({ name: "   " })), "23514");
    await fails(() => saveSession(session({ duration: 0 })), "23514");
    await fails(() => saveSession(session({ effort: 6 })), "23514");
    await fails(() => saveSession(session({ date: "infinity" })), "23514");
    await fails(() => saveSession(session({ exercises: [entry({ avgDuration: -1 })] })), "23514");
});

test("malformed payloads fail clearly; routines may become empty but sessions may not", async () => {
    for (const value of [null, [], {}, { id: SA, exercises: null }]) {
        await fails(() => saveSession(value), "22023");
        await fails(() => saveRoutine(value), "22023");
    }
    await fails(() => saveSession(session({ exercises: [] })), "22023");
    await saveRoutine(routine({ exercises: [] }));
    assert.equal((await rows("select * from public.routine_exercises")).length, 0);
});

test("custom sessions use NULL routine IDs and preserve original creation time on retry", async () => {
    await saveSession(session({ id: SECOND, routineId: "custom", createdAt: "2025-01-01T12:00:00Z", effort: 3 }));
    await saveSession(session({ id: SECOND, routineId: null, createdAt: "2026-01-01T12:00:00Z", effort: 4 }), 1);
    const [saved] = await rows("select * from public.sessions where id = $1", [SECOND]);
    assert.equal(saved.routine_id, null);
    assert.equal(saved.created_at.toISOString(), "2025-01-01T12:00:00.000Z");
    assert.equal(saved.effort, 4);
});

test("duplicate entry IDs fail atomically, but the same exercise can appear twice", async () => {
    await fails(() => saveSession(session({ exercises: [entry(), entry()] })), "23505");
    await saveSession(session({ exercises: [entry(), entry({ id: OTHER_ENTRY })] }));
    assert.equal((await rows("select * from public.session_exercises where session_id = $1", [SA])).length, 2);
});

test("snapshots survive renames and subsequent unrelated session edits", async () => {
    await saveExercise({ id: EA, name: "Renamed exercise", metricType: "weight" });
    await saveRoutine(routine({ name: "Renamed routine" }));
    await saveSession(session({ duration: 2400 }));
    assert.equal((await rows("select exercise_name_snapshot from public.session_exercises where session_id = $1", [SA]))[0].exercise_name_snapshot, "Dumbbell curl");
    assert.equal((await rows("select routine_name_snapshot from public.sessions where id = $1", [SA]))[0].routine_name_snapshot, "My routine");
    await saveSession(session({ id: SECOND, exercise_name_snapshot: "Forged", exercises: [entry({ exercise_name_snapshot: "Forged" })] }));
    assert.equal((await rows("select exercise_name_snapshot from public.session_exercises where session_id = $1", [SECOND]))[0].exercise_name_snapshot, "Renamed exercise");
    assert.equal((await rows("select routine_name_snapshot from public.sessions where id = $1", [SECOND]))[0].routine_name_snapshot, "Renamed routine");
});

test("replacing an exercise entry captures the new exercise's name", async () => {
    await saveExercise({ id: SECOND, name: "New exercise", metricType: "weight" });
    await saveSession(session({ exercises: [entry({ exerciseId: SECOND })] }));
    assert.equal((await rows("select exercise_name_snapshot from public.session_exercises where session_id = $1", [SA]))[0].exercise_name_snapshot, "New exercise");
});

test("new records start at revision one, and repeated creates never overwrite", async () => {
    const [created] = (await saveSession(session({ id: SECOND }))).rows;
    assert.equal(created.revision, 1);
    await fails(() => saveSession(session({ id: SECOND })), "PT409");
    await fails(() => saveSession(session(), null), "PT409");
    await fails(() => saveRoutine(routine(), null), "PT409");
    await fails(() => saveExercise({ id: EA, name: "Forged", metricType: "weight" }, null), "PT409");
});

test("stale revisions cannot update or delete records", async () => {
    await saveSession(session());
    await fails(() => saveSession(session()), "PT409");
    await fails(() => deleteSession(SA), "PT409");
    await saveRoutine(routine());
    await fails(() => saveRoutine(routine()), "PT409");
    await fails(() => deleteRoutine(RA), "PT409");
    await saveExercise({ id: EA, name: "Updated", metricType: "weight" });
    await fails(() => saveExercise({ id: EA, name: "Stale", metricType: "weight" }), "PT409");
});

test("updates of deleted records never recreate them", async () => {
    await deleteSession(SA);
    await fails(() => saveSession(session()), "PT409");
    await deleteRoutine(RA);
    await fails(() => saveRoutine(routine()), "PT409");
    assert.equal((await rows("select * from public.sessions")).length, 0);
    assert.equal((await rows("select * from public.routines")).length, 0);
});

test("archiving invalidates affected routine editors and rejects reintroducing archived exercises", async () => {
    await archive([EA]);
    assert.equal((await rows("select revision from public.routines where id = $1", [RA]))[0].revision, 2);
    await fails(() => saveRoutine(routine()), "PT409");
    await fails(() => saveRoutine(routine(), 2), "22023");
    await fails(() => saveRoutine(routine({ id: SECOND })), "22023");
    await saveSession(session()); // Existing history can still reference archived definitions.
    assert.equal((await rows("select * from public.session_exercises")).length, 1);
});

test("archiving after a routine save removes the entry and increments its revision", async () => {
    await saveRoutine(routine());
    await archive([EA]);
    assert.equal((await rows("select * from public.routine_exercises")).length, 0);
    assert.equal((await rows("select revision from public.routines where id = $1", [RA]))[0].revision, 3);
    await archive([EA]); // Retrying the archive does not produce phantom edits.
    assert.equal((await rows("select revision from public.routines where id = $1", [RA]))[0].revision, 3);
});

test("exercise archive state cannot bypass the archive operation", async () => {
    await fails(() => saveExercise({ id: EA, name: "Curl", metricType: "weight", archived: true }), "22023");
    await archive([EA]);
    await saveExercise({ id: EA, name: "Renamed archived curl", metricType: "weight", archived: false }, 2);
    assert.equal((await rows("select archived from public.exercises where id = $1", [EA]))[0].archived, true);
});

test("invalid revisions fail clearly", async () => {
    for (const revision of [0, -1]) {
        await fails(() => saveSession(session(), revision), "22023");
        await fails(() => saveRoutine(routine(), revision), "22023");
        await fails(() => saveExercise({ id: EA }, revision), "22023");
        await fails(() => deleteSession(SA, revision), "22023");
    }
    await fails(() => deleteSession(SA, null), "22023");
});

test("internal helpers are not directly executable by clients; public wrappers do not elevate privileges", async () => {
    await fails(() => db.query("select workout_private.lock_owner()"), "42501");
    await fails(() => db.query("select workout_private.check_payload('{}', null, false)"), "42501");
    const exposed = await rows("select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef");
    assert.equal(exposed.length, 0);
    await fails(() => db.query("select workout_private.delete_workout('exercises', $1, 1)", [EA]), "22023");
});

test("upgrading an existing database backfills names without changing record identity or metrics", async () => {
    const upgrade = new PGlite();
    try {
        await upgrade.exec(`
            create role anon nologin; create role authenticated nologin;
            create schema auth; create table auth.users (id uuid primary key);
            create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
        `);
        const migrations = new URL("../supabase/migrations/", import.meta.url);
        const files = (await readdir(migrations)).filter((file) => file.endsWith(".sql")).sort();
        await upgrade.exec(await readFile(new URL(files[0], migrations), "utf8"));
        await upgrade.exec(`
            insert into auth.users values ('${A}');
            insert into public.exercises (id, user_id, name, metric_type) values ('${EA}', '${A}', 'Existing curl', 'weight');
            insert into public.routines (id, user_id, name) values ('${RA}', '${A}', 'Existing routine');
            insert into public.sessions (id, user_id, workout_date, duration_seconds, routine_id)
                values ('${SA}', '${A}', '2026-11-09', 600, '${RA}');
            insert into public.session_exercises (id, user_id, session_id, exercise_id, position, metric_type, sets, reps, weight_kg)
                values ('${ENTRY}', '${A}', '${SA}', '${EA}', 0, 'weight', 3, 10, 12.5);
        `);
        for (const file of files.slice(1)) await upgrade.exec(await readFile(new URL(file, migrations), "utf8"));
        const [saved] = (await upgrade.query("select id, revision, duration_seconds, routine_name_snapshot from public.sessions")).rows;
        assert.deepEqual(saved, { id: SA, revision: 1, duration_seconds: 600, routine_name_snapshot: "Existing routine" });
        const [entry] = (await upgrade.query("select id, exercise_name_snapshot, sets from public.session_exercises")).rows;
        assert.deepEqual(entry, { id: ENTRY, exercise_name_snapshot: "Existing curl", sets: 3 });
    } finally {
        await upgrade.close();
    }
});

async function connection(user = A) {
    const client = new Client({ connectionString: postgresUrl });
    await client.connect();
    await client.query("set role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
    // Also prevents a broken implementation from hanging the test process.
    await client.query("set statement_timeout = '5s'");
    return client;
}

const nativeOnly = { skip: !postgresUrl && "Requires TEST_POSTGRES_URL for independent PostgreSQL connections" };

test("concurrency: exactly one of two same-revision saves succeeds", nativeOnly, async () => {
    const one = await connection();
    const two = await connection();
    try {
        const results = await Promise.allSettled([
            one.query("select * from public.save_session($1, 1)", [JSON.stringify(session({ duration: 700 }))]),
            two.query("select * from public.save_session($1, 1)", [JSON.stringify(session({ duration: 800 }))]),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(results.find((r) => r.status === "rejected").reason.code, "PT409");
        const [saved] = await rows("select revision, duration_seconds from public.sessions where id = $1", [SA]);
        assert.equal(saved.revision, 2);
        assert.ok([700, 800].includes(saved.duration_seconds));
    } finally {
        await Promise.all([one.end(), two.end()]);
    }
});

test("concurrency: archive locks out routine saves without blocking another account", nativeOnly, async () => {
    const one = await connection();
    const two = await connection();
    const other = await connection(B);
    try {
        await one.query("begin");
        await one.query("select public.archive_exercises($1::uuid[])", [[EA]]);
        await two.query("set lock_timeout = '200ms'");
        await assert.rejects(() => two.query("select * from public.save_routine($1, 1)", [JSON.stringify(routine())]), { code: "55P03" });
        await other.query("set lock_timeout = '200ms'");
        const foreign = await other.query("select * from public.save_routine($1, 1)", [JSON.stringify(routine({ id: RB, exercises: [] }))]);
        assert.equal(foreign.rows[0].revision, 2);
        await one.query("commit");
        await assert.rejects(() => two.query("select * from public.save_routine($1, 1)", [JSON.stringify(routine())]), { code: "PT409" });
        await assert.rejects(() => two.query("select * from public.save_routine($1, 2)", [JSON.stringify(routine())]), { code: "22023" });
        assert.equal((await rows("select * from public.routine_exercises where routine_id = $1", [RA])).length, 0);
    } finally {
        await one.query("rollback");
        await Promise.all([one.end(), two.end(), other.end()]);
    }
});

test("concurrency: archive following a locked routine save removes its new entries", nativeOnly, async () => {
    const one = await connection();
    const two = await connection();
    try {
        await one.query("begin");
        await one.query("select * from public.save_routine($1, 1)", [JSON.stringify(routine())]);
        await two.query("set lock_timeout = '200ms'");
        await assert.rejects(() => two.query("select public.archive_exercises($1::uuid[])", [[EA]]), { code: "55P03" });
        await one.query("commit");
        await two.query("select public.archive_exercises($1::uuid[])", [[EA]]);
        assert.equal((await rows("select * from public.routine_exercises where routine_id = $1", [RA])).length, 0);
        assert.equal((await rows("select revision from public.routines where id = $1", [RA]))[0].revision, 3);
    } finally {
        await one.query("rollback");
        await Promise.all([one.end(), two.end()]);
    }
});

test("concurrency: a save waiting behind deletion cannot recreate the deleted session", nativeOnly, async () => {
    const one = await connection();
    const two = await connection();
    try {
        await one.query("begin");
        await one.query("select public.delete_session($1, 1)", [SA]);
        // Start the stale save while deletion owns the account lock, then release it.
        const pending = two.query("select * from public.save_session($1, 1)", [JSON.stringify(session())]);
        const rejected = assert.rejects(pending, { code: "PT409" });
        await one.query("commit");
        await rejected;
        assert.equal((await rows("select * from public.sessions where id = $1", [SA])).length, 0);
    } finally {
        await one.query("rollback");
        await Promise.all([one.end(), two.end()]);
    }
});
