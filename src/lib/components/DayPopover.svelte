<script lang="ts">
    import * as Popover from "$lib/components/ui/popover/index.js";
    import * as Calendar from "$lib/components/ui/calendar/index.js";
    import { formatDuration, getLevel, INTENSITY_MAP } from "$lib/constants";
    import { sessionManager } from "$lib/Session.svelte";
    import { exerciseManager } from "$lib/Exercise.svelte";
    import MetricDisplay from "./MetricDisplay.svelte";
    import { BicepsFlexed, Timer } from "@lucide/svelte";
    import StarDisplay from "./StarDisplay.svelte";

    let { date, selectedDate = $bindable(), selectedSession } = $props();
</script>

<Popover.Root>
    <Popover.Trigger>
        <Calendar.Day
            class={INTENSITY_MAP[
                getLevel(sessionManager.sessions[date.toString()]?.effort ?? 0)
            ]}
            onclick={() => {
                selectedDate = date.toString();
            }}
        />
    </Popover.Trigger>

    <Popover.Content class="gap-1">
        <p class="font-extrabold text-lg">
            Sessions on {selectedDate}
        </p>
        {#if selectedSession}
            <div class="space-y-3">
                <p class="text-muted-foreground">
                    {formatDuration(selectedSession.duration)}, {selectedSession.effort}
                    ★
                </p>

                <div>
                    <p class="font-bold text-base">Exercises:</p>
                    {#each selectedSession.exercises as entry}
                        {@const exercise = exerciseManager.getById(
                            entry.exerciseId,
                        )}
                        <p>
                            {exercise.name}
                        </p>
                        <MetricDisplay exercise={entry} size="lg" />
                    {:else}
                        <p>No exercise logged</p>
                    {/each}
                </div>
            </div>
        {:else}
            <p>No sessions logged</p>
        {/if}
    </Popover.Content>
</Popover.Root>
