<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import type { Session } from "$lib/types";
    import { onMount } from "svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { getLevel, INTENSITY_MAP } from "$lib/constants";

    let sessionData = $state<Record<string, Session>>({});
    onMount(() => {
        sessionData = JSON.parse(
            localStorage.getItem("EXERCISES_STORED") ?? "{}",
        );
    });
</script>

<header class="space-y-5 mb-10">
    <BackBtn />
    <h1>Sessions</h1>
</header>

<div class="grid gap-4">
    {#each Object.values(sessionData).slice(0, 2) as session}
        <Card.Root>
            <Card.Header>
                <Card.Title class="flex justify-between">
                    <span>
                        {session.date}
                    </span>
                    <span>{session.effort} ★ </span>
                </Card.Title>
                <Card.Description>{session.duration} mins</Card.Description>
            </Card.Header>

            <Card.Content>
                <ul class="list-disc list-inside space-y-1">
                    {#each session.exercises as exercise}
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
        <p>No Sessions Created</p>
    {/each}
</div>
