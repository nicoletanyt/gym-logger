<script lang="ts">
    import { ChevronDown, ChevronRight } from "@lucide/svelte";
    import { getLocalTimeZone, today } from "@internationalized/date";
    import { Calendar } from "$lib/components/ui/calendar/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { onMount } from "svelte";
    import type { Routine, Session } from "$lib/types";

    let dateValue = $state(today(getLocalTimeZone()));

    let showSessions = $state(false);
    let showRoutines = $state(true);

    let sessionData = $state<Record<string, Session>>({});
    let routinesData = $state<Routine[]>([
        {
            id: crypto.randomUUID(),
            name: "Leg Day",
            exercises: [
                { name: "bicep curls", sets: 3, reps: 15 },
                { name: "triceps curls", sets: 3, reps: 15 },
            ],
        },
    ]);

    onMount(() => {
        sessionData = JSON.parse(
            localStorage.getItem("EXERCISES_STORED") ?? "{}",
        );
    });
</script>

<header>
    <h1 class="text-center">Gym Logger</h1>
</header>

<section>
    <Calendar
        type="single"
        bind:value={dateValue}
        class="rounded-md border shadow-sm items-center"
        captionLayout="dropdown"
        {sessionData}
    />
</section>

<section>
    <Button variant="default" class="w-1/2 m-auto" href="/log"
        >Log Session</Button
    >
</section>

<section class="grid-cols-2 gap-5">
    <Card.Root>
        <Card.Header>
            <Card.Title>Total Sessions</Card.Title>
        </Card.Header>
        <Card.Content>
            <p>{Object.keys(sessionData).length}</p>
        </Card.Content>
    </Card.Root>
    <Card.Root>
        <Card.Header>
            <Card.Title>Total Time</Card.Title>
        </Card.Header>
        <Card.Content>
            <p>
                {Object.values(sessionData).reduce(
                    (acc, curr: Session) => acc + curr.duration,
                    0,
                )}
            </p>
        </Card.Content>
    </Card.Root>
</section>

<hr />
<section>
    <div class="flex justify-between items-center">
        <h2>All Sessions</h2>
        <Button
            variant="ghost"
            size="icon-lg"
            onclick={() => {
                showSessions = !showSessions;
            }}
        >
            {#if showSessions}
                <ChevronDown />
            {:else}
                <ChevronRight />
            {/if}
        </Button>
    </div>
</section>

<section class="space-y-5">
    <div class="flex justify-between items-center">
        <h2>Routines</h2>
        <Button
            variant="ghost"
            size="icon-lg"
            onclick={() => {
                showRoutines = !showRoutines;
            }}
        >
            {#if showRoutines}
                <ChevronDown />
            {:else}
                <ChevronRight />
            {/if}
        </Button>
    </div>
    {#if showRoutines}
        {#each routinesData as routine}
            <Card.Root size="sm">
                <Card.Header>
                    <Card.Title>{routine.name}</Card.Title>
                    <Card.Description>Total Sessions:</Card.Description>
                </Card.Header>

                <Card.Content>
                    <ul class="list-disc list-inside space-y-1">
                        {#each routine.exercises as exercise}
                            <li>
                                <span class="font-bold">{exercise.name}</span>: {exercise.reps}
                                reps, {exercise.sets}
                                sets
                            </li>
                        {/each}
                    </ul>
                </Card.Content>
            </Card.Root>
        {:else}
            <p>No Routines Created</p>
        {/each}

        <Button variant="secondary" href="/routines/new">Create Routine</Button>
    {/if}
</section>
