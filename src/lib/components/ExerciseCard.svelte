<script lang="ts">
    import type { Exercise, ExerciseMetric } from "$lib/Exercise.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import MetricDisplay from "./MetricDisplay.svelte";
    import ExerciseImage from "./ExerciseImage.svelte";
    import LibraryCard from "./LibraryCard.svelte";

    type Props = {
        exercise: Exercise;
        metric?: ExerciseMetric;
        navigable?: boolean;
        selectable?: boolean;
        selected?: boolean;
        onselect?: (id: string) => void;
    };

    let {
        exercise,
        metric,
        navigable = true,
        selectable = false,
        selected = false,
        onselect,
    }: Props = $props();

    const hasHistory = $derived(Object.values(sessionManager.sessions).some((session) =>
        session.exercises.some((entry) => entry.exerciseId === exercise.id),
    ));
    const displayedMetric = $derived(metric ?? (hasHistory ? sessionManager.getLatestExercise(exercise.id) : undefined));

</script>

<LibraryCard
    title={exercise.name}
    href={navigable ? `/exercises/${exercise.id}` : undefined}
    {selectable}
    {selected}
    onselect={() => onselect?.(exercise.id)}
>
    {#snippet image()}
        <ExerciseImage src={exercise.imageLink} alt="" class="size-14 shrink-0 rounded-md" />
    {/snippet}
    {#snippet meta()}
        {#if displayedMetric}<MetricDisplay metric={displayedMetric} />{/if}
    {/snippet}
</LibraryCard>
