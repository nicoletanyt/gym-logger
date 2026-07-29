<script lang="ts">
    import AddBtn from "$lib/components/AddBtn.svelte";
    import { routineManager, type Routine } from "$lib/Routine.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import { goto } from "$app/navigation";
    import { exerciseManager } from "$lib/Exercise.svelte";
    import MetricDisplay from "$lib/components/MetricDisplay.svelte";

    let newRoutine = $state<Routine>(routineManager.createDefault());
</script>

<header>
    <h1>Routines</h1>
</header>

<!-- List of Exercises -->
<section>
    {#each routineManager.routines as routine}
        <Card.Root
            onclick={() => {
                goto("/routines/" + routine.id);
            }}
        >
            <Card.Header>
                <Card.Title class="flex justify-between">
                    <span class="font-bold">
                        {routine.name}
                    </span>
                </Card.Title>
            </Card.Header>

            <Card.Content class="space-y-2">
                {#each routine.exercises as entry, key}
                    {@const exercise = exerciseManager.getById(
                        entry.exerciseId,
                    )}
                    <div class="flex justify-between items-center">
                        <div>
                            <span>{key + 1}.</span>
                            <span class="text-base">{exercise.name}</span>
                        </div>
                        <MetricDisplay exercise={entry} size="lg" />
                    </div>
                {/each}
            </Card.Content>
        </Card.Root>
    {:else}
        <p>No Routines Created</p>
    {/each}
</section>

<AddBtn
    onclick={() => {
        goto("/routines/new");
    }}
/>
