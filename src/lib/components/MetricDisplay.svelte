<script lang="ts">
    import { UNITS, type ExerciseMetric } from "$lib/Exercise.svelte";
    import { Dumbbell, Layers3, Repeat2, Route, Timer, type LucideIcon } from "@lucide/svelte";

    const metricIcons: Record<keyof typeof UNITS, LucideIcon> = {
        sets: Layers3,
        reps: Repeat2,
        weight: Dumbbell,
        duration: Timer,
        distance: Route,
    };

    const {
        metric,
        size = "default",
    }: { metric: ExerciseMetric; size?: "lg" | "default" } = $props();
</script>

<div
    class={`flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground ${size == "lg" ? "text-sm" : "text-xs"}`}
>
    {#each Object.entries(metric) as [label, value]}
        {#if label != "type"}
            {@const Icon = metricIcons[label as keyof typeof UNITS]}
            <span class="inline-flex items-center gap-1">
            <Icon aria-hidden="true" class="size-3.5 shrink-0" />
            <span>
                {#if value == 0}
                    -
                {:else}
                    {value}
                {/if}
                {UNITS[label as keyof typeof UNITS]}
            </span>
            </span>
        {/if}
    {/each}
</div>
