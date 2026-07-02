<script lang="ts">
    import type { MetricDetails } from "$lib/Exercise.svelte";

    const {
        metric,
        size = "default",
    }: { metric: MetricDetails; size?: "sm" | "default" } = $props();
</script>

{#if size == "sm"}
    <div class={`py-1 px-2 rounded h-fit ${metric.colour}`}>
        <metric.icon class="size-7 p-1" />
    </div>
{:else}
    <div
        class={`flex items-center gap-1.5 px-3 py-2 w-fit rounded ${metric.colour}`}
    >
        <metric.icon class="size-5" />
        <p class="text-sm font-medium">{metric.name}</p>
    </div>
{/if}
