<script lang="ts">
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import {
        exerciseManager,
        METRICS,
        type ExerciseEntry,
        type ExerciseMetric,
        type MetricType,
    } from "$lib/Exercise.svelte";
    import { Plus, XIcon } from "@lucide/svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";
    import Button from "./ui/button/button.svelte";
    import ActionButton from "./ActionButton.svelte";
    import Input from "./ui/input/input.svelte";
    import Field from "./Field.svelte";
    import MetricDisplay from "./MetricDisplay.svelte";

    let { exercises = $bindable() }: { exercises: ExerciseEntry[] } = $props();
    let metric = $state<ExerciseMetric>(createMetric("weight"));
    let exerciseId = $state("");

    let showAdd = $state(false);

    function createMetric(type: MetricType): ExerciseMetric {
        switch (type) {
            case "weight":
                return {
                    type,
                    sets: 0,
                    weight: 0,
                    reps: 0,
                };

            case "reps":
                return {
                    type,
                    sets: 0,
                    reps: 0,
                };

            case "duration":
                return {
                    type,
                    sets: 0,
                    duration: 0,
                };

            case "cardio":
                return {
                    type,
                    sets: 0,
                    duration: 0,
                    distance: 0,
                };
        }
    }

    function onExerciseChanged(exerciseId: string) {
        const exercise = exerciseManager.getById(exerciseId);
        metric = createMetric(exercise.metricType);
    }
</script>

<div class="grid gap-3">
    {#each exercises as e}
        {@const exercise = exerciseManager.getById(e.exerciseId)}
        <Card.Root size={"sm"} class="mx-px">
            <Card.Content class="flex justify-between items-center">
                <div class="space-y-2">
                    <p class="font-bold">{exercise.name}</p>
                    <div class="flex gap-2 items-center">
                        <MetricDisplay exercise={e} />
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

<Sheet.Root bind:open={showAdd}>
    <!-- Add Buttton -->
    <Sheet.Content side="bottom" class="min-h-150 p-4" showCloseButton={false}>
        <Sheet.Header class="flex justify-between items-center">
            <Sheet.Title>Add Exercise</Sheet.Title>
            <Button
                variant="ghost"
                size="icon-sm"
                onclick={() => {
                    showAdd = false;
                }}
            >
                <XIcon />
                <span class="sr-only">Close</span>
            </Button>
        </Sheet.Header>
        <section class="px-4 my-0">
            <Field label="Exercise">
                <Combobox
                    noun="exercise"
                    options={exerciseManager.exercises.map((m) => {
                        return {
                            value: m.id,
                            label: m.name,
                        };
                    })}
                    bind:value={exerciseId}
                    onChange={() => onExerciseChanged(exerciseId)}
                />
            </Field>
            <Field label="Sets">
                <Input type="number" bind:value={metric.sets} />
            </Field>
            {#if metric.type == "weight"}
                <Field label="Weight">
                    <Input type="number" bind:value={metric.weight} />
                </Field>
                <Field label="Reps">
                    <Input type="number" bind:value={metric.reps} />
                </Field>
            {:else if metric.type == "reps"}
                <Field label="Reps">
                    <Input type="number" bind:value={metric.reps} />
                </Field>
            {:else if metric.type == "duration"}
                <Field label="Duration">
                    <Input type="number" bind:value={metric.duration} />
                </Field>
            {:else if metric.type == "cardio"}
                <Field label="Duration">
                    <Input type="number" bind:value={metric.duration} />
                </Field>
                <Field label="Distance">
                    <Input type="number" bind:value={metric.distance} />
                </Field>
            {/if}
        </section>

        <ActionButton
            text="Add Exercise"
            onOverlay={true}
            onclick={() => {
                const result = exerciseManager.createExerciseEntry(
                    exerciseId,
                    metric,
                );
                if (result.success) exercises.push(result.data);
                else alert(result.message);
                showAdd = false;
            }}
        />
    </Sheet.Content>
</Sheet.Root>
