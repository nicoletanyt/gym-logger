<script lang="ts">
    import type { Routine } from "$lib/Routine.svelte";
    import LibraryCard from "./LibraryCard.svelte";
    import WorkoutCardMeta from "./WorkoutCardMeta.svelte";
    import ExercisePreview from "./ExercisePreview.svelte";

    let {
        routine,
        selectable = false,
        selected = false,
        onselect,
    }: {
        routine: Routine;
        selectable?: boolean;
        selected?: boolean;
        onselect?: (id: string) => void;
    } = $props();

</script>

{#snippet preview()}
    <ExercisePreview exercises={routine.exercises} />
{/snippet}

<LibraryCard title={routine.name} href={`/routines/${routine.id}`} {selectable} {selected} onselect={() => onselect?.(routine.id)} tintedHeader children={routine.exercises.length > 0 ? preview : undefined}>
    {#snippet meta()}
        <WorkoutCardMeta exerciseCount={routine.exercises.length} />
    {/snippet}
</LibraryCard>
