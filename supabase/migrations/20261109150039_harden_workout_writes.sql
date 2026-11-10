-- Keep the first migration intact. This migration replaces the public write
-- contract: NULL expected revision means CREATE, a positive revision means UPDATE.
alter table public.exercises add column revision integer not null default 1 check (revision > 0);
alter table public.routines add column revision integer not null default 1 check (revision > 0);
alter table public.sessions add column revision integer not null default 1 check (revision > 0);
alter table public.sessions add column routine_name_snapshot text;
alter table public.session_exercises add column exercise_name_snapshot text;

update public.sessions s set routine_name_snapshot = r.name
from public.routines r where s.routine_id = r.id and s.user_id = r.user_id;
update public.session_exercises se set exercise_name_snapshot = e.name
from public.exercises e where se.exercise_id = e.id and se.user_id = e.user_id;
alter table public.session_exercises alter column exercise_name_snapshot set not null;
alter table public.session_exercises add constraint session_exercises_snapshot_name
    check (length(btrim(exercise_name_snapshot)) between 1 and 200);

-- Prefer known workout times to record creation times within a workout day.
-- Date-only records retain a deterministic fallback, without inventing a time.
drop index public.sessions_user_date_created_idx;
create index sessions_user_history_idx on public.sessions
    (user_id, workout_date desc, started_at desc nulls last, created_at desc, id desc);

create schema workout_private;
revoke all on schema workout_private from public, anon, authenticated;
-- Needed for invoker wrappers; this schema must NOT be exposed in the Data API.
grant usage on schema workout_private to authenticated;

create function workout_private.advance_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
    new.revision := old.revision + 1;
    new.created_at := old.created_at;
    return new;
end;
$$;
create trigger exercises_revision before update on public.exercises
    for each row execute function workout_private.advance_revision();
create trigger routines_revision before update on public.routines
    for each row execute function workout_private.advance_revision();
create trigger sessions_revision before update on public.sessions
    for each row execute function workout_private.advance_revision();

-- Every API mutation obtains the same per-account transaction lock BEFORE it
-- reads mutable state. This deliberately trades same-account write parallelism
-- for simple archive/save/delete/snapshot consistency at personal-app scale.
create function workout_private.lock_owner()
returns uuid language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
    if owner_id is null then
        raise exception 'Sign in before changing workout data' using errcode = '42501';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
    return owner_id;
end;
$$;

create function workout_private.check_payload(payload jsonb, expected_revision integer, has_entries boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
    if jsonb_typeof(payload) is distinct from 'object' or payload->>'id' is null
        or (has_entries and jsonb_typeof(payload->'exercises') is distinct from 'array') then
        raise exception 'An object with an id and, when required, an exercises array is required' using errcode = '22023';
    end if;
    if expected_revision is not null and expected_revision < 1 then
        raise exception 'Expected revision must be positive or null for creation' using errcode = '22023';
    end if;
end;
$$;

create function workout_private.save_exercise(p_exercise jsonb, p_expected_revision integer)
returns public.exercises language plpgsql security definer set search_path = '' as $$
declare
    owner_id uuid := workout_private.lock_owner();
    saved public.exercises;
begin
    perform workout_private.check_payload(p_exercise, p_expected_revision, false);
    if coalesce((p_exercise->>'archived')::boolean, false) then
        raise exception 'Use archive_exercises to archive an exercise' using errcode = '22023';
    end if;
    if p_expected_revision is null then
        insert into public.exercises (id, user_id, name, metric_type, image_link, note)
        values ((p_exercise->>'id')::uuid, owner_id, p_exercise->>'name',
            p_exercise->>'metricType', p_exercise->>'imageLink', p_exercise->>'note')
        on conflict (id) do nothing returning * into saved;
    else
        update public.exercises set name = p_exercise->>'name', metric_type = p_exercise->>'metricType',
            image_link = p_exercise->>'imageLink', note = p_exercise->>'note'
        where id = (p_exercise->>'id')::uuid and user_id = owner_id and revision = p_expected_revision
        returning * into saved;
    end if;
    if saved.id is null then
        raise exception 'Exercise changed, is unavailable, or already exists; reload before saving' using errcode = 'PT409';
    end if;
    return saved;
end;
$$;

create function workout_private.save_routine(p_routine jsonb, p_expected_revision integer)
returns public.routines language plpgsql security definer set search_path = '' as $$
declare
    owner_id uuid := workout_private.lock_owner();
    saved public.routines;
begin
    perform workout_private.check_payload(p_routine, p_expected_revision, true);
    if p_expected_revision is null then
        insert into public.routines (id, user_id, name)
        values ((p_routine->>'id')::uuid, owner_id, p_routine->>'name')
        on conflict (id) do nothing returning * into saved;
    else
        update public.routines set name = p_routine->>'name'
        where id = (p_routine->>'id')::uuid and user_id = owner_id and revision = p_expected_revision
        returning * into saved;
    end if;
    if saved.id is null then
        raise exception 'Routine changed, is unavailable, or already exists; reload before saving' using errcode = 'PT409';
    end if;
    -- Ownership is explicitly checked even though this function bypasses RLS.
    if exists (
        select 1 from jsonb_array_elements(p_routine->'exercises') as entries(entry)
        left join public.exercises e on e.id = (entry->>'exerciseId')::uuid and e.user_id = owner_id
        where e.id is null or e.archived
    ) then
        raise exception 'Routine exercises must belong to you and be active' using errcode = '22023';
    end if;

    delete from public.routine_exercises where routine_id = saved.id and user_id = owner_id;
    insert into public.routine_exercises (
        id, user_id, routine_id, exercise_id, position, metric_type,
        sets, reps, weight_kg, duration_minutes, distance_km
    )
    select (entry->>'id')::uuid, owner_id, saved.id, (entry->>'exerciseId')::uuid,
        (ordinality - 1)::integer, entry->'metric'->>'type',
        (entry->'metric'->>'sets')::integer, (entry->'metric'->>'reps')::integer,
        (entry->'metric'->>'weight')::numeric, (entry->'metric'->>'duration')::numeric,
        (entry->'metric'->>'distance')::numeric
    from jsonb_array_elements(p_routine->'exercises') with ordinality as entries(entry, ordinality);
    return saved;
end;
$$;

create function workout_private.save_session(p_session jsonb, p_expected_revision integer)
returns public.sessions language plpgsql security definer set search_path = '' as $$
declare
    owner_id uuid := workout_private.lock_owner();
    saved public.sessions;
    previous public.sessions;
    previous_entries jsonb := '[]'::jsonb;
    selected_routine uuid;
    selected_routine_name text;
begin
    perform workout_private.check_payload(p_session, p_expected_revision, true);
    if jsonb_array_length(p_session->'exercises') = 0 then
        raise exception 'A session requires at least one exercise' using errcode = '22023';
    end if;
    if p_expected_revision is not null then
        select * into previous from public.sessions
        where id = (p_session->>'id')::uuid and user_id = owner_id and revision = p_expected_revision;
        if previous.id is null then
            raise exception 'Session changed or is unavailable; reload before saving' using errcode = 'PT409';
        end if;
        select coalesce(jsonb_agg(jsonb_build_object('id', id, 'exerciseId', exercise_id, 'name', exercise_name_snapshot)), '[]'::jsonb)
        into previous_entries from public.session_exercises where session_id = previous.id and user_id = owner_id;
    end if;
    selected_routine := nullif(p_session->>'routineId', 'custom')::uuid;
    if selected_routine is not null then
        select name into selected_routine_name from public.routines where id = selected_routine and user_id = owner_id;
        if not found then
            raise exception 'Routine is unavailable' using errcode = '22023';
        end if;
    end if;
    if previous.id is not null and previous.routine_id is not distinct from selected_routine then
        selected_routine_name := previous.routine_name_snapshot;
    end if;
    if exists (
        select 1 from jsonb_array_elements(p_session->'exercises') as entries(entry)
        left join public.exercises e on e.id = (entry->>'exerciseId')::uuid and e.user_id = owner_id
        where e.id is null
    ) then
        raise exception 'Session exercises must belong to you' using errcode = '22023';
    end if;

    if p_expected_revision is null then
        insert into public.sessions (
            id, user_id, workout_date, duration_seconds, routine_id, routine_name_snapshot, started_at, effort, created_at
        ) values (
            (p_session->>'id')::uuid, owner_id, (p_session->>'date')::date,
            (p_session->>'duration')::integer, selected_routine, selected_routine_name,
            (p_session->>'startTime')::timestamptz, (p_session->>'effort')::smallint,
            coalesce((p_session->>'createdAt')::timestamptz, now())
        ) on conflict (id) do nothing returning * into saved;
    else
        update public.sessions set workout_date = (p_session->>'date')::date,
            duration_seconds = (p_session->>'duration')::integer, routine_id = selected_routine,
            routine_name_snapshot = selected_routine_name, started_at = (p_session->>'startTime')::timestamptz,
            effort = (p_session->>'effort')::smallint
        where id = previous.id and user_id = owner_id and revision = p_expected_revision
        returning * into saved;
    end if;
    if saved.id is null then
        raise exception 'Session changed, is unavailable, or already exists; reload before saving' using errcode = 'PT409';
    end if;

    delete from public.session_exercises where session_id = saved.id and user_id = owner_id;
    insert into public.session_exercises (
        id, user_id, session_id, exercise_id, position, metric_type, sets, reps,
        weight_kg, duration_minutes, distance_km, avg_duration_seconds, exercise_name_snapshot
    )
    select (entry->>'id')::uuid, owner_id, saved.id, e.id,
        (ordinality - 1)::integer, entry->'metric'->>'type',
        (entry->'metric'->>'sets')::integer, (entry->'metric'->>'reps')::integer,
        (entry->'metric'->>'weight')::numeric, (entry->'metric'->>'duration')::numeric,
        (entry->'metric'->>'distance')::numeric, (entry->>'avgDuration')::numeric,
        coalesce((select old->>'name' from jsonb_array_elements(previous_entries) as old_entries(old)
            where (old->>'id')::uuid = (entry->>'id')::uuid
                and (old->>'exerciseId')::uuid = (entry->>'exerciseId')::uuid), e.name)
    from jsonb_array_elements(p_session->'exercises') with ordinality as entries(entry, ordinality)
    join public.exercises e on e.id = (entry->>'exerciseId')::uuid and e.user_id = owner_id;
    return saved;
end;
$$;

create function workout_private.delete_workout(p_kind text, p_id uuid, p_expected_revision integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
    owner_id uuid := workout_private.lock_owner();
    removed uuid;
begin
    if p_expected_revision is null or p_expected_revision < 1 then
        raise exception 'A positive expected revision is required for deletion' using errcode = '22023';
    end if;
    if p_kind = 'session' then
        delete from public.sessions where id = p_id and user_id = owner_id and revision = p_expected_revision returning id into removed;
    elsif p_kind = 'routine' then
        delete from public.routines where id = p_id and user_id = owner_id and revision = p_expected_revision returning id into removed;
        -- The FK clears routine_id but preserves the name snapshot. The revision
        -- trigger also invalidates any stale session editor affected by this.
    else
        raise exception 'Unknown workout kind' using errcode = '22023';
    end if;
    if removed is null then
        raise exception 'Record changed or is unavailable; reload before deleting' using errcode = 'PT409';
    end if;
end;
$$;

create function workout_private.archive_exercises(p_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := workout_private.lock_owner();
begin
    update public.exercises set archived = true
    where user_id = owner_id and id = any(p_ids) and not archived;
    -- Template cleanup is a real edit: stale template editors must conflict.
    update public.routines r set name = r.name where r.user_id = owner_id and exists (
        select 1 from public.routine_exercises re where re.user_id = owner_id
            and re.routine_id = r.id and re.exercise_id = any(p_ids)
    );
    delete from public.routine_exercises where user_id = owner_id and exercise_id = any(p_ids);
end;
$$;

-- Thin exposed wrappers never elevate privileges themselves. All elevated logic
-- is in a non-exposed schema, with explicit auth/owner checks and no dynamic SQL.
drop function public.save_session(jsonb);
drop function public.save_routine(jsonb);
create function public.save_session(p_session jsonb, p_expected_revision integer default null)
returns public.sessions language sql security invoker set search_path = '' as $$
    select workout_private.save_session(p_session, p_expected_revision);
$$;
create function public.save_routine(p_routine jsonb, p_expected_revision integer default null)
returns public.routines language sql security invoker set search_path = '' as $$
    select workout_private.save_routine(p_routine, p_expected_revision);
$$;
create function public.save_exercise(p_exercise jsonb, p_expected_revision integer default null)
returns public.exercises language sql security invoker set search_path = '' as $$
    select workout_private.save_exercise(p_exercise, p_expected_revision);
$$;
create function public.delete_session(p_id uuid, p_expected_revision integer)
returns void language sql security invoker set search_path = '' as $$
    select workout_private.delete_workout('session', p_id, p_expected_revision);
$$;
create function public.delete_routine(p_id uuid, p_expected_revision integer)
returns void language sql security invoker set search_path = '' as $$
    select workout_private.delete_workout('routine', p_id, p_expected_revision);
$$;
create or replace function public.archive_exercises(p_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
    select workout_private.archive_exercises(p_ids);
$$;

revoke all on all functions in schema workout_private from public, anon, authenticated;
grant execute on function workout_private.save_exercise(jsonb, integer),
    workout_private.save_routine(jsonb, integer), workout_private.save_session(jsonb, integer),
    workout_private.delete_workout(text, uuid, integer), workout_private.archive_exercises(uuid[]) to authenticated;
revoke all on function public.save_exercise(jsonb, integer), public.save_routine(jsonb, integer),
    public.save_session(jsonb, integer), public.delete_session(uuid, integer),
    public.delete_routine(uuid, integer), public.archive_exercises(uuid[]) from public, anon, authenticated;
grant execute on function public.save_exercise(jsonb, integer), public.save_routine(jsonb, integer),
    public.save_session(jsonb, integer), public.delete_session(uuid, integer),
    public.delete_routine(uuid, integer), public.archive_exercises(uuid[]) to authenticated;

revoke all on public.exercises, public.routines, public.sessions, public.routine_exercises,
    public.session_exercises from public, anon, authenticated;
grant select on public.exercises, public.routines, public.sessions, public.routine_exercises,
    public.session_exercises to authenticated;
drop policy exercises_owner on public.exercises;
drop policy routines_owner on public.routines;
drop policy sessions_owner on public.sessions;
drop policy routine_exercises_owner on public.routine_exercises;
drop policy session_exercises_owner on public.session_exercises;
create policy exercises_owner on public.exercises for select to authenticated using ((select auth.uid()) = user_id);
create policy routines_owner on public.routines for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_owner on public.sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy routine_exercises_owner on public.routine_exercises for select to authenticated using ((select auth.uid()) = user_id);
create policy session_exercises_owner on public.session_exercises for select to authenticated using ((select auth.uid()) = user_id);

comment on function public.save_session(jsonb, integer) is 'Create with null expected revision; update with a matching positive revision. PT409 means reload, never silently retry stale data.';
comment on function public.save_routine(jsonb, integer) is 'Revision-checked atomic template save; archived exercises are rejected.';
comment on function public.save_exercise(jsonb, integer) is 'Revision-checked exercise create/update; ownership and archived state cannot be supplied by the client.';
comment on column public.session_exercises.exercise_name_snapshot is 'Name captured when an entry is added; preserved on edits with the same entry and exercise UUIDs.';
comment on column public.sessions.routine_name_snapshot is 'Historical routine name; preserved across routine rename or deletion.';
