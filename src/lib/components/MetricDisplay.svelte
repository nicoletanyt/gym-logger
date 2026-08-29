<script lang="ts">
    import { UNITS, type ExerciseMetric } from "$lib/Exercise.svelte";

    const {
        metric,
        size = "default",
    }: { metric: ExerciseMetric; size?: "lg" | "default" } = $props();
</script>

<div
    class={`flex space-x-1 flex-wrap items-center text-muted-foreground ${size == "lg" ? "text-sm" : "text-xs"}`}
>
    {#each Object.entries(metric) as [label, value], key}
        {#if label != "type"}
            <p>
                {#if value == 0}
                    -
                {:else}
                    {value}
                {/if}
                {UNITS[label as keyof typeof UNITS]}
            </p>
            {#if key != Object.values(metric).length - 1}
                <span class="size-1 rounded-full bg-muted-foreground"></span>
            {/if}
        {/if}
    {/each}
</div>
