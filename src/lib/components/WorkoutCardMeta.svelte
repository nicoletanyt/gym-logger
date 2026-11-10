<script lang="ts">
    import { Dumbbell, Timer } from "@lucide/svelte";
    import { formatDuration } from "$lib/constants";

    let { exerciseCount, duration }: { exerciseCount: number; duration?: number } = $props();
</script>

<p data-slot="workout-card-meta" class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-normal text-muted-foreground">
    <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Dumbbell class="size-3.5 shrink-0" aria-hidden="true" />
        <span>{exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}</span>
    </span>
    {#if duration !== undefined}
        <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Timer class="size-3.5 shrink-0" aria-hidden="true" />
            <span class="sr-only">Duration:</span><span>{formatDuration(duration)}</span>
        </span>
    {/if}
</p>
