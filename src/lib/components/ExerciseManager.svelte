<script lang="ts">
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { DEFAULT_EXERCISE } from "$lib/constants";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import {
        exerciseManager,
        METRICS,
        type Exercise,
        type ExerciseEntry,
        type ExerciseMetric,
        type MetricType,
    } from "$lib/Exercise.svelte";
    import { Plus } from "@lucide/svelte";
    import ExerciseCard from "./ExerciseCard.svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";
    import Button from "./ui/button/button.svelte";
    import ActionButton from "./ActionButton.svelte";
    import Label from "./ui/label/label.svelte";
    import Input from "./ui/input/input.svelte";

    const exercises: ExerciseEntry[] = [
        {
            exerciseId: "c2a21666-a5a6-4ee0-b8cb-28bb39f075e3",
            metric: {
                type: "weight",
                sets: 3,
                weight: 11,
                reps: 15,
            },
        },
    ];
    let metricType = $state<MetricType>("weight");
    let metric = $state<ExerciseMetric>({
        type: "weight",
        sets: 3,
        weight: 11,
        reps: 15,
    });
    let newEntry = $state<ExerciseEntry>({
        exerciseId: "",
        metric: metric,
    });

    let showAdd = $state(false);
</script>

<div class="grid gap-3">
    {#each exercises as e}
        {@const exercise = exerciseManager.getById(e.exerciseId)}
        <Card.Root onclick={() => {}}>
            <Card.Content class="flex justify-between items-center">
                <div class="space-y-2">
                    <p class="font-bold">{exercise.name}</p>
                    <div class="flex gap-2 items-center">
                        <p>1 Set</p>
                        <span class="size-1 rounded-full bg-muted-foreground"
                        ></span>
                        <p>10 Reps</p>
                    </div>
                </div>
                <!-- TAG -->
                <MetricTypeTag
                    metric={METRICS[exercise.metricType]}
                    size="sm"
                />
            </Card.Content>
        </Card.Root>
    {/each}
    <Button
        variant="secondary"
        class="w-fit ml-auto"
        onclick={() => {
            showAdd = true;
        }}
    >
        <Plus />
    </Button>
</div>

<Sheet.Root open={showAdd}>
    <!-- Add Buttton -->
    <Sheet.Content side="bottom" class="min-h-150 p-4">
        <Sheet.Header>
            <Sheet.Title>Add Exercise</Sheet.Title>
        </Sheet.Header>
        <section class="px-4 my-0">
            <div class="flex justify-between">
                <Label>Exercise</Label>
                <Combobox
                    noun="exercise"
                    options={exerciseManager.exercises.map((m) => {
                        return {
                            value: m.id,
                            label: m.name,
                        };
                    })}
                    bind:value={newEntry.exerciseId}
                />
            </div>
            <div class="flex justify-between">
                <Label>Exercise Type</Label>
                <Combobox
                    noun="type"
                    options={Object.values(METRICS).map((m) => {
                        return {
                            value: m.name.toLowerCase(),
                            label: m.name,
                        };
                    })}
                    bind:value={metricType}
                />
            </div>
            <div class="flex justify-between">
                <Label>Sets</Label>
                <Input type="number" class="w-1/2" />
            </div>
            {#if metricType == "weight"}
                <div class="flex justify-between">
                    <Label>Weight</Label>
                    <Input type="number" class="w-1/2" />
                </div>
                <div class="flex justify-between">
                    <Label>Reps</Label>
                    <Input type="number" class="w-1/2" />
                </div>
            {/if}
        </section>

        <ActionButton
            text="Add Exercise"
            className="p-8"
            onclick={() => {
                // exerciseManager.addExercise(newExercise);
                exerciseManager.updateData();
                showAdd = false;
            }}
        />
    </Sheet.Content>
</Sheet.Root>
