<script lang="ts">
    import { goto } from "$app/navigation";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import { METRICS, type Exercise } from "$lib/Exercise.svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";

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
                    <p>1 Set</p>
                    <span class="size-1 rounded-full bg-muted-foreground"></span>
                    <p>10 Reps</p>
                </div>
            </div>
            <!-- TAG -->
            <MetricTypeTag metric={METRICS[exercise.metricType]} size="sm" />
        </Card.Content>
    </Card.Root>
</div>
