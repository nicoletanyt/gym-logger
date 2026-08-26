<script lang="ts">
    import { goto } from "$app/navigation";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import { METRICS, type Exercise } from "$lib/Exercise.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";
    import MetricDisplay from "./MetricDisplay.svelte";

    type Props = {
        exercise: Exercise;
        selectable?: boolean;
        selected?: boolean;
        onselect?: (id: string) => void;
    };

    let {
        exercise,
        selectable = false,
        selected = false,
        onselect,
    }: Props = $props();

    let latestMetric = $derived(sessionManager.getLatestExercise(exercise.id));
</script>

<div class="flex gap-3 items-center">
    {#if selectable}
        <Checkbox
            class="size-5"
            checked={selected}
            onCheckedChange={() => {
                onselect?.(exercise.id);
            }}
        />
    {/if}
    <Card.Root
        class="flex-1 {selected ? 'border-primary' : ''}"
        onclick={() => {
            if (selectable) onselect?.(exercise.id);
            else goto("/exercises/" + exercise.id);
        }}
    >
        <Card.Content class="flex justify-between items-center">
            <div class="space-y-2">
                <p class="font-bold">{exercise.name}</p>
                <div class="flex gap-2 items-center">
                    <MetricDisplay metric={latestMetric} />
                </div>
            </div>
            <!-- TAG -->
            <MetricTypeTag metric={METRICS[exercise.metricType]} size="sm" />
        </Card.Content>
    </Card.Root>
</div>
