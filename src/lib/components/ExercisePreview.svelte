<script lang="ts">
    import type { ExerciseEntry } from "$lib/Exercise.svelte";
    import ExerciseEntryContent from "./ExerciseEntryContent.svelte";

    let { exercises, showMetrics = true }: { exercises: ExerciseEntry[]; showMetrics?: boolean } = $props();
    const PREVIEW_LIMIT = 4;
    const remainingCount = $derived(Math.max(0, exercises.length - PREVIEW_LIMIT));
</script>

{#if exercises.length > 0}
    <ol class="mt-4 divide-y divide-border">
        {#each exercises.slice(0, PREVIEW_LIMIT) as entry (entry.id)}
            <li class="py-4 first:pt-0 last:pb-0">
                <ExerciseEntryContent {entry} {showMetrics} />
            </li>
        {/each}
    </ol>
{/if}
{#if remainingCount > 0}
    <p class="mt-3 text-xs text-muted-foreground">+{remainingCount} more {remainingCount === 1 ? "exercise" : "exercises"}</p>
{/if}
