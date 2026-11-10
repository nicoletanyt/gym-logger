<script lang="ts">
    import { exerciseManager, METRICS, type ExerciseEntry } from "$lib/Exercise.svelte";
    import ExerciseImage from "./ExerciseImage.svelte";
    import MetricDisplay from "./MetricDisplay.svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";

    let {
        entry,
        showMetrics = true,
        showImages = false,
    }: { entry: ExerciseEntry; showMetrics?: boolean; showImages?: boolean } = $props();
    const exercise = $derived(exerciseManager.getById(entry.exerciseId));
</script>

<div data-slot="exercise-entry-content" class="flex min-w-0 items-center justify-between gap-3">
    {#if showImages && exercise?.imageLink}
        <ExerciseImage src={exercise.imageLink} alt="" class="size-14 shrink-0 rounded-md" />
    {/if}
    <div class="min-w-0 flex-1 space-y-2">
        <p class="text-sm font-bold leading-5 wrap-anywhere">{entry.exerciseName ?? exercise?.name ?? "Unknown exercise"}</p>
        {#if showMetrics}
            <MetricDisplay metric={entry.metric} />
        {/if}
    </div>
    {#if showMetrics}
        <MetricTypeTag metric={METRICS[entry.metric.type]} size="sm" />
    {/if}
</div>
