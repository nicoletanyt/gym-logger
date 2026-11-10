# Workout database

The schema is deployed to project `uurfrehjtqsfegcgsjyt` through Supabase MCP.
The frontend now uses hosted Supabase Auth and these database RPCs. No local
Supabase stack is needed or started for this project workflow. Previous browser
data is never automatically uploaded or deleted.

## Model and security

### Exercise images

The deployed migration `20261110120000_exercise_images.sql` creates the private
`exercise-images` Storage bucket and ownership policies. Uploads are limited to
5 MiB and JPEG, PNG, or WebP. The database stores a `storage:exercise-images/`
reference in `exercises.image_link`; the file is stored in Supabase Storage under
the user's UUID. The client uses short-lived signed URLs. Bundled library images
are local files with attribution in `static/exercise-images/CREDITS.md`; existing
external image URLs remain supported.

Storage and database writes cannot share a transaction. Confirmed revision
conflicts trigger best-effort cleanup of a new upload, but network failures may
leave unreferenced files. Replaced and archived images are retained to avoid
breaking historical records or racing concurrent saves. Administrators should
periodically audit unreferenced objects and remove them through the Storage API,
after allowing for in-flight uploads; account deletion also requires Storage
object cleanup. Do not delete objects directly from the Storage database tables.

| Table | Purpose |
| --- | --- |
| `exercises` | User-owned exercise definitions, including archived definitions needed by history |
| `routines` | Named workout templates |
| `routine_exercises` | Ordered template entries with target metrics |
| `sessions` | Completed workouts, identified by UUID rather than date |
| `session_exercises` | Ordered historical exercise metrics |

- All tables have ownership-based RLS. Anonymous clients have no table or RPC
  access. Use a signed-in user's session and a publishable key, never a service-role
  key in the frontend.
- Authenticated clients have **read-only table access**. All mutations, including
  exercise edits and session/routine deletion, must use the functions below.
- Public RPC wrappers are `SECURITY INVOKER`. Their privileged implementations live
  in `workout_private`, use a fixed empty search path, authenticate every operation,
  and explicitly restrict every record lookup/write to that user. Do **not** add
  `workout_private` to the hosted project's exposed Data API schemas. The local
  configuration already excludes it.
- Composite foreign keys include `user_id`, so owning a child record does not
  allow linking it to somebody else's session, routine, or exercise.
- `workout_date` is a user-selected calendar date, not a UTC timestamp, and is not
  unique. Order history by `workout_date DESC`, `started_at DESC NULLS LAST`,
  `created_at DESC`, then `id DESC`. Start times are actual workout timestamps;
  creation timestamps are only a fallback. Date-only imports must not be shown as
  though their record creation time were their actual workout time.
- Session duration and average set duration are **seconds**; exercise metric
  duration is **minutes**, weight is **kg**, and distance is **km**. Metrics have
  variant-specific constraints; decimal measurements retain three decimal places.
- Entry UUIDs are scoped to their parent. Copying routine entry IDs to multiple
  sessions does not cause primary key conflicts. Always order entries by `position`.
- Deleting a routine clears `sessions.routine_id` but keeps completed workouts.
  Deleting a session cascades only its own entries.
- Session entries have `exercise_name_snapshot`; sessions have an optional
  `routine_name_snapshot`. These preserve names when definitions are renamed or
  archived, or a routine is deleted. Unchanged entry/exercise IDs retain their
  snapshot during subsequent session edits. New/replaced entries capture the
  current name from the database, never a client-supplied snapshot. Existing rows
  are backfilled from current definitions; pre-migration names cannot be recovered.
- Clients cannot hard-delete exercises. `archive_exercises` archives definitions
  and removes their routine entries in a single transaction, retaining history.
  When rendering history, include archived definitions in exercise lookups.
- Exercise foreign keys are deferred until commit to support complete account
  deletion without depending on the order of Auth cascade triggers. This does not
  bypass ownership constraints: an invalid reference fails the transaction.
- There is no custom profile table: Supabase Auth already provides user identity
  and email. Email/password registration and sign-in are available at `/sign-in`.

## Atomic writes

Call these functions using `supabase.rpc(...)` after signing in. The private
implementations derive ownership from `auth.uid()`, not a supplied user ID.

Exercises, routines, and sessions have a server-managed `revision`, initially `1`.
For every save:

- Omit `p_expected_revision` (or send `null`) to **create only**. A duplicate UUID
  returns HTTP **409**, rather than overwriting anything.
- Supply the positive revision you loaded to **update only**. The function checks
  it, increments the revision, and returns the new row. Missing, foreign-owned,
  or changed records return HTTP **409** (`PT409`). An update never creates a row.
- On a network failure or 409, reload the record and reconcile. Do not blindly
  change the expected revision and resubmit a stale full-record payload.
- For deletions, supply the revision too. A stale delete cannot remove newer edits.

Every mutation acquires a transaction-scoped **per-account advisory lock** before
reading mutable data. This serializes same-account changes, including archive,
save, and delete operations; different users remain independent. Revision checks
still reject stale editors after the lock is released. The intended isolation
level is PostgREST's default `READ COMMITTED`.

### `save_exercise({ p_exercise, p_expected_revision? })`

Accepts `{ id, name, metricType, imageLink?, note? }`. It cannot change ownership
or unarchive a definition. Use `archive_exercises` rather than setting `archived`.

### `save_session({ p_session, p_expected_revision? })`

The input uses the existing application's `Session` shape:

```ts
{
    id: crypto.randomUUID(),
    date: "2026-11-09",
    duration: 1800, // Seconds, not the minutes entered in the log form.
    routineId: "custom", // A routine UUID, "custom", null, or omitted.
    exercises: [{
        id: crypto.randomUUID(),
        exerciseId: "<an exercise UUID belonging to the signed-in user>",
        metric: { type: "weight", sets: 3, reps: 10, weight: 12.5 },
        avgDuration: 60 // Optional seconds.
    }]
}
```

Optional fields are `startTime` (ISO timestamp), `effort` (1–5), and `createdAt`
(ISO timestamp, useful for a later import). Use `null` to represent a deleted
routine; do not send a deleted routine's old UUID. At least one valid exercise is
required by the RPC. `createdAt` is only applied on the first insert.

### `save_routine({ p_routine, p_expected_revision? })`

Accepts `{ id, name, exercises }` using the same entry shape. Routines may be
empty, including after all of their exercises have been archived. All referenced
exercise definitions must belong to the caller and be **active**. A stale routine
payload cannot reintroduce an archived exercise.

Routine/session saves return the saved **parent row**, not nested children. They
create or revision-check the parent and replace all entries atomically; invalid
metrics or references roll back the parent, revision, and entries together.

### `delete_session({ p_id, p_expected_revision })` / `delete_routine(...)`

Delete an owned record only if its revision matches. Routine deletion retains
historical routine-name snapshots and bumps the revision of sessions whose
`routine_id` is cleared, invalidating stale session editors.

### `archive_exercises({ p_ids })`

Accepts an array of exercise UUIDs. IDs owned by another user are ignored. Archive
through this RPC rather than only setting `archived`, so template cleanup is
included. Archived definitions remain readable and may be referenced by historical
entries; the active exercise picker should filter `archived = false`.
Affected routines have their revisions incremented, so open template editors must
reload after archive cleanup. A repeated archive with no further changes is a no-op.

## Tests

```sh
npm ci
npm run test:db
```

The tests apply every migration to an ephemeral PGlite PostgreSQL instance with
two test identities. They verify RLS, grants, cross-user foreign keys, valid and
invalid metrics, atomic rollback, direct-write denial, revisions, snapshots,
same-day workouts, migration backfill, and account deletion. No Docker, remote
keys, or real Auth accounts are needed. The local Auth schema is a stand-in.

Four concurrency tests require independent native PostgreSQL connections and are
explicitly skipped in PGlite mode. To run **all** database tests, supply
`TEST_POSTGRES_URL` pointing to a fresh, disposable, loopback PostgreSQL 17 cluster
with an empty test database and a superuser login:

```sh
TEST_POSTGRES_URL='postgresql://postgres:LOCAL_TEST_PASSWORD@127.0.0.1:55439/workout_tests' npm run test:db
```

This mode creates the test Auth roles/schema and applies migrations. Do not point
it at the full Supabase database or an existing development database; recreate the
disposable cluster before rerunning it. Native tests cover competing same-revision
saves, archive/save interleavings in both orders, account independence, and a save
waiting behind deletion. They still do not test GoTrue or PostgREST.

### Real Supabase Auth / Data API tests

With Docker installed, start the local stack and replay migrations:

```sh
npx supabase start
npx supabase db reset
npx supabase status -o env
```

Use the **local** URL, anon JWT key, and service-role JWT key from `status`:

```sh
TEST_SUPABASE_URL='http://127.0.0.1:54321' \
TEST_SUPABASE_ANON_KEY='LOCAL_ANON_KEY' \
TEST_SUPABASE_SERVICE_ROLE_KEY='LOCAL_SERVICE_ROLE_KEY' \
npm run test:db:integration
```

The suite provisions temporary confirmed users, signs in with real email/password
authentication, and checks RLS, write restrictions, snapshots, conflicts, and races
through HTTP. Only fixture setup/cleanup uses the service-role key; assertions use
user JWTs. It deletes only its own temporary users, refuses hosted URLs, and skips
with an explicit reason when configuration is absent. Email delivery and frontend
cookie/session handling are outside its scope. Do not commit test keys.

## Migrations and generated types

The checked-in migration version matches the version recorded by Supabase MCP.
Do not re-run it in the SQL editor on the existing project.

Local CLI configuration is checked in at `supabase/config.toml`. It does not change
hosted Auth settings. Only use `db reset` against a disposable **local** database.
The workout, hardening, and exercise image migrations have been deployed to the
hosted project. New projects must apply all three migrations.

After reviewing and testing future migrations, authenticate the CLI and link the
intended remote project before pushing:

```sh
npx supabase login
npx supabase link --project-ref uurfrehjtqsfegcgsjyt
npx supabase db push --dry-run
npx supabase db push
```

Regenerate `src/lib/database.types.ts` after schema changes:

```sh
npx supabase gen types typescript --project-id uurfrehjtqsfegcgsjyt --schema public > src/lib/database.types.ts
```

Generated `metric_type` fields are strings because the database uses checked text
rather than a Postgres enum. The eventual data-access layer should map database
rows back into the application's discriminated `ExerciseMetric` union.
