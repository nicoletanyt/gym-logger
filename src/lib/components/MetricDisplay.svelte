<script lang="ts">
    import { UNITS, type ExerciseEntry } from "$lib/Exercise.svelte";

    const {
        exercise,
        size = "default",
    }: { exercise: ExerciseEntry; size?: "lg" | "default" } = $props();
</script>

<div
    class={`flex space-x-1 flex-wrap items-center text-muted-foreground ${size == "lg" ? "text-sm" : "text-xs"}`}
>
    {#each Object.entries(exercise.metric) as [label, value], key}
        {#if label != "type"}
            <p>
                {value}
                {UNITS[label as keyof typeof UNITS]}
            </p>
            {#if key != Object.values(exercise.metric).length - 1}
                <span class="size-1 rounded-full bg-muted-foreground"></span>
            {/if}
        {/if}
    {/each}
</div>
