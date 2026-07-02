<script lang="ts">
    import ExerciseCard from "$lib/components/ExerciseCard.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { exerciseManager } from "$lib/Exercise.svelte";
    import { Plus } from "@lucide/svelte";
    import { onMount } from "svelte";
    import { v4 as uuidv4 } from "uuid";

    onMount(() => {
        exerciseManager.exercises = [
            {
                id: uuidv4(),
                name: "Bicep Curls",
                metricType: "weight",
            },
            {
                id: uuidv4(),
                name: "Crunches",
                metricType: "reps",
            },
        ];
        exerciseManager.updateData();
    });
</script>

<header>
    <h1>Exercises</h1>
</header>

<!-- List of Exercises -->
<section>
    {#each exerciseManager.exercises as item}
        <ExerciseCard exercise={item} />
    {/each}
</section>

<!-- TODO: -->
<!-- Add Buttton -->
<Button class="absolute bottom-5 right-0" size="icon-lg">
    <Plus />
</Button>
