<script lang="ts">
    import { goto } from "$app/navigation";
    import * as Card from "$lib/components/ui/card/index.js";
    import { METRICS, type Exercise } from "$lib/Exercise.svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";

    type Props = {
        exercise: Exercise;
    };

    let { exercise }: Props = $props();
</script>

<Card.Root
    onclick={() => {
        goto("/exercises/" + exercise.id);
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
