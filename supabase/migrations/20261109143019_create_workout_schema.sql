-- User-owned workout data. Dates are deliberately NOT unique: a user may
-- complete multiple sessions on the same day. Existing browser data is not imported.
create table public.exercises (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name text not null check (length(btrim(name)) between 1 and 200),
    metric_type text not null check (metric_type in ('weight', 'reps', 'duration', 'cardio')),
    image_link text,
    note text,
    archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, id)
);

create table public.routines (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    name text not null check (length(btrim(name)) between 1 and 200),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, id)
);

create table public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    workout_date date not null check (isfinite(workout_date)),
    duration_seconds integer not null check (duration_seconds > 0),
    routine_id uuid,
    started_at timestamptz check (isfinite(started_at)),
    effort smallint check (effort between 1 and 5),
    created_at timestamptz not null default now() check (isfinite(created_at)),
    updated_at timestamptz not null default now(),
    unique (user_id, id),
    -- Clearing only routine_id preserves ownership and completed workouts when
    -- a routine is deleted (Postgres 15+ column-specific SET NULL).
    foreign key (user_id, routine_id) references public.routines(user_id, id)
        on delete set null (routine_id)
);

create table public.routine_exercises (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null default auth.uid(),
    routine_id uuid not null,
    exercise_id uuid not null,
    position integer not null check (position >= 0),
    metric_type text not null check (metric_type in ('weight', 'reps', 'duration', 'cardio')),
    sets integer not null check (sets > 0),
    reps integer check (reps > 0),
    weight_kg numeric(10, 3) check (weight_kg > 0 and weight_kg < 'Infinity'::numeric),
    duration_minutes numeric(10, 3) check (duration_minutes > 0 and duration_minutes < 'Infinity'::numeric),
    distance_km numeric(10, 3) check (distance_km > 0 and distance_km < 'Infinity'::numeric),
    -- Entry IDs can be copied from a routine into multiple sessions, so their
    -- identity is scoped to the parent rather than globally unique.
    primary key (routine_id, id),
    unique (user_id, routine_id, position),
    foreign key (user_id, routine_id) references public.routines(user_id, id) on delete cascade,
    -- Deferred until commit so deleting an Auth account can cascade through
    -- exercises AND routines/sessions without depending on trigger order.
    foreign key (user_id, exercise_id) references public.exercises(user_id, id)
        deferrable initially deferred,
    constraint routine_exercises_metric_shape check (
        (metric_type = 'weight' and weight_kg is not null and reps is not null and duration_minutes is null and distance_km is null)
        or (metric_type = 'reps' and reps is not null and weight_kg is null and duration_minutes is null and distance_km is null)
        or (metric_type = 'duration' and duration_minutes is not null and reps is null and weight_kg is null and distance_km is null)
        or (metric_type = 'cardio' and duration_minutes is not null and distance_km is not null and reps is null and weight_kg is null)
    )
);

create table public.session_exercises (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null default auth.uid(),
    session_id uuid not null,
    exercise_id uuid not null,
    position integer not null check (position >= 0),
    metric_type text not null check (metric_type in ('weight', 'reps', 'duration', 'cardio')),
    sets integer not null check (sets > 0),
    reps integer check (reps > 0),
    weight_kg numeric(10, 3) check (weight_kg > 0 and weight_kg < 'Infinity'::numeric),
    duration_minutes numeric(10, 3) check (duration_minutes > 0 and duration_minutes < 'Infinity'::numeric),
    distance_km numeric(10, 3) check (distance_km > 0 and distance_km < 'Infinity'::numeric),
    avg_duration_seconds numeric(12, 3) check (avg_duration_seconds >= 0 and avg_duration_seconds < 'Infinity'::numeric),
    primary key (session_id, id),
    unique (user_id, session_id, position),
    foreign key (user_id, session_id) references public.sessions(user_id, id) on delete cascade,
    -- Do not cascade exercise deletion into history. Clients archive instead.
    foreign key (user_id, exercise_id) references public.exercises(user_id, id)
        deferrable initially deferred,
    constraint session_exercises_metric_shape check (
        (metric_type = 'weight' and weight_kg is not null and reps is not null and duration_minutes is null and distance_km is null)
        or (metric_type = 'reps' and reps is not null and weight_kg is null and duration_minutes is null and distance_km is null)
        or (metric_type = 'duration' and duration_minutes is not null and reps is null and weight_kg is null and distance_km is null)
        or (metric_type = 'cardio' and duration_minutes is not null and distance_km is not null and reps is null and weight_kg is null)
    )
);

-- Prefix indexes support both ownership filtering and foreign key lookups.
create index exercises_user_archived_idx on public.exercises(user_id, archived);
create index sessions_user_date_created_idx on public.sessions(user_id, workout_date desc, created_at desc, id);
create index sessions_user_routine_idx on public.sessions(user_id, routine_id);
create index routine_exercises_user_exercise_idx on public.routine_exercises(user_id, exercise_id);
create index session_exercises_user_exercise_idx on public.session_exercises(user_id, exercise_id);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger exercises_updated_at before update on public.exercises
    for each row execute function public.set_updated_at();
create trigger routines_updated_at before update on public.routines
    for each row execute function public.set_updated_at();
create trigger sessions_updated_at before update on public.sessions
    for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.sessions enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.session_exercises enable row level security;

create policy exercises_owner on public.exercises for all to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routines_owner on public.routines for all to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sessions_owner on public.sessions for all to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routine_exercises_owner on public.routine_exercises for all to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy session_exercises_owner on public.session_exercises for all to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Remove Supabase's default grants before granting only the intended access.
revoke all on public.exercises, public.routines, public.sessions,
    public.routine_exercises, public.session_exercises from public, anon, authenticated;
grant select, insert, update on public.exercises to authenticated;
grant select, insert, update, delete on public.routines, public.sessions,
    public.routine_exercises, public.session_exercises to authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- These invoker RPCs use the caller's RLS policies, never a service-role key.
-- Each call is one transaction: failed entries roll back the parent and all
-- replacement entries. Upserting the parent also serializes concurrent saves.
create function public.save_routine(p_routine jsonb)
returns public.routines
language plpgsql
security invoker
set search_path = ''
as $$
declare
    owner_id uuid := auth.uid();
    saved public.routines;
begin
    if owner_id is null then
        raise exception 'Sign in before saving a routine' using errcode = '42501';
    end if;
    if jsonb_typeof(p_routine) is distinct from 'object'
        or p_routine->>'id' is null
        or jsonb_typeof(p_routine->'exercises') is distinct from 'array' then
        raise exception 'A routine requires an id and an exercises array' using errcode = '22023';
    end if;

    insert into public.routines (id, user_id, name)
    values ((p_routine->>'id')::uuid, owner_id, p_routine->>'name')
    on conflict (id) do update set name = excluded.name
    returning * into saved;

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

create function public.save_session(p_session jsonb)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
    owner_id uuid := auth.uid();
    saved public.sessions;
begin
    if owner_id is null then
        raise exception 'Sign in before saving a session' using errcode = '42501';
    end if;
    if jsonb_typeof(p_session) is distinct from 'object'
        or p_session->>'id' is null
        or jsonb_typeof(p_session->'exercises') is distinct from 'array' then
        raise exception 'A session requires an id and an exercises array' using errcode = '22023';
    end if;
    if jsonb_array_length(p_session->'exercises') = 0 then
        raise exception 'A session requires at least one exercise' using errcode = '22023';
    end if;

    insert into public.sessions (
        id, user_id, workout_date, duration_seconds, routine_id, started_at, effort, created_at
    ) values (
        (p_session->>'id')::uuid, owner_id, (p_session->>'date')::date,
        (p_session->>'duration')::integer, nullif(p_session->>'routineId', 'custom')::uuid,
        (p_session->>'startTime')::timestamptz, (p_session->>'effort')::smallint,
        coalesce((p_session->>'createdAt')::timestamptz, now())
    )
    on conflict (id) do update set
        workout_date = excluded.workout_date, duration_seconds = excluded.duration_seconds,
        routine_id = excluded.routine_id, started_at = excluded.started_at, effort = excluded.effort
    returning * into saved;

    delete from public.session_exercises where session_id = saved.id and user_id = owner_id;
    insert into public.session_exercises (
        id, user_id, session_id, exercise_id, position, metric_type,
        sets, reps, weight_kg, duration_minutes, distance_km, avg_duration_seconds
    )
    select (entry->>'id')::uuid, owner_id, saved.id, (entry->>'exerciseId')::uuid,
        (ordinality - 1)::integer, entry->'metric'->>'type',
        (entry->'metric'->>'sets')::integer, (entry->'metric'->>'reps')::integer,
        (entry->'metric'->>'weight')::numeric, (entry->'metric'->>'duration')::numeric,
        (entry->'metric'->>'distance')::numeric, (entry->>'avgDuration')::numeric
    from jsonb_array_elements(p_session->'exercises') with ordinality as entries(entry, ordinality);
    return saved;
end;
$$;

create function public.archive_exercises(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
    owner_id uuid := auth.uid();
begin
    if owner_id is null then
        raise exception 'Sign in before archiving exercises' using errcode = '42501';
    end if;
    update public.exercises set archived = true where user_id = owner_id and id = any(p_ids);
    delete from public.routine_exercises where user_id = owner_id and exercise_id = any(p_ids);
    -- Session entries and their referenced exercise rows are deliberately retained.
end;
$$;

revoke all on function public.save_routine(jsonb), public.save_session(jsonb),
    public.archive_exercises(uuid[]) from public, anon, authenticated;
grant execute on function public.save_routine(jsonb), public.save_session(jsonb),
    public.archive_exercises(uuid[]) to authenticated;

comment on table public.sessions is 'Completed workouts; duration_seconds is seconds, workout_date is the user-selected local date.';
comment on column public.sessions.routine_id is 'NULL represents a custom workout or a deleted routine; never the string custom.';
comment on table public.session_exercises is 'Historical metrics, independent of the current exercise metric_type. Read archived exercises when displaying history.';
comment on function public.save_session(jsonb) is 'Atomically upsert a Session-shaped JSON object and replace its ordered entries, scoped to auth.uid().';
comment on function public.save_routine(jsonb) is 'Atomically upsert a Routine-shaped JSON object and replace its ordered entries, scoped to auth.uid().';
