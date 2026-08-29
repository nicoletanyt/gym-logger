<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import { formatDuration } from "$lib/constants";
    import { exerciseManager } from "$lib/Exercise.svelte";
    import type { Session } from "$lib/Session.svelte";
    import MetricDisplay from "./MetricDisplay.svelte";

    type Props = {
        session: Session;
        onclick?: () => void;
    };

    let { session, onclick }: Props = $props();
</script>

<Card.Root class="cursor-pointer" {onclick}>
    <Card.Header>
        <Card.Title class="flex justify-between">
            <span class="font-bold">
                {session.date}
            </span>
            <span class="text-muted-foreground text-sm">
                {formatDuration(session.duration)}
            </span>
        </Card.Title>
    </Card.Header>

    <Card.Content class="space-y-2">
        {#each session.exercises as entry, key}
            {@const exercise = exerciseManager.getById(entry.exerciseId)}
            <div class="flex justify-between items-center">
                <div>
                    <span>{key + 1}.</span>
                    <span class="text-base">{exercise.name}</span>
                </div>
                <MetricDisplay metric={entry.metric} size="lg" />
            </div>
        {/each}
    </Card.Content>
</Card.Root>
