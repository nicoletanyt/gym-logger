<script lang="ts">
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import {
        exerciseManager,
        METRICS,
        type ExerciseEntry,
        type ExerciseMetric,
        type MetricType,
    } from "$lib/Exercise.svelte";
    import { Check, Pencil, Plus, Trash, XIcon } from "@lucide/svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";
    import Button from "./ui/button/button.svelte";
    import ActionButton from "./ActionButton.svelte";
    import Input from "./ui/input/input.svelte";
    import Field from "./Field.svelte";
    import MetricDisplay from "./MetricDisplay.svelte";

    let {
        exercises = $bindable(),
        routineId = $bindable(),
    }: { exercises: ExerciseEntry[]; routineId?: string } = $props();
    import { routineManager } from "$lib/Routine.svelte";
    let metric = $state<ExerciseMetric>(createMetric("weight"));
    let exerciseId = $state("");

    let selectedRows = $state<string[]>([]);

    let showAdd = $state(false);
    let showEdit = $state(false);

    function persistChanges() {
        if (routineId) {
            const routine = routineManager.getById(routineId);
            if (routine) {
                routine.exercises = exercises;
                routineManager.updateRoutine(routine);
            }
        }
    }

    function deleteItems() {
        exercises = exercises.filter((e) => !selectedRows.includes(e.id));
        selectedRows = [];
        persistChanges();
    }

    function editItem() {
        const selected = exercises.find((e) => e.id == selectedRows[0])!;
        exerciseId = selected.exerciseId;
        metric = selected.metric;
        showAdd = true;
    }

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

    $effect(() => {
        if (!showAdd) {
            metric = createMetric("weight");
            exerciseId = "";
        }
        if (!showEdit) {
            selectedRows = [];
        }
    });
</script>

<div class="grid gap-3">
    {#each exercises as e}
        {@const exercise = exerciseManager.getById(e.exerciseId)}
        <div class="flex gap-2 items-center">
            {#if showEdit}
                <Checkbox
                    class="shrink-0 size-5"
                    checked={selectedRows.includes(e.id)}
                    onCheckedChange={(checked) => {
                        if (checked) {
                            selectedRows = [...selectedRows, e.id];
                        } else {
                            selectedRows = selectedRows.filter(
                                (id) => id != e.id,
                            );
                        }
                    }}
                />
            {/if}
            <Card.Root size={"sm"} class="mx-px flex-1">
                <Card.Content class="flex justify-between items-center">
                    <div class="space-y-2">
                        <p class="font-bold">{exercise.name}</p>
                        <div class="flex gap-2 items-center">
                            <MetricDisplay metric={e.metric} />
                        </div>
                    </div>
                    <!-- TAG -->
                    <MetricTypeTag
                        metric={METRICS[exercise.metricType]}
                        size="sm"
                    />
                </Card.Content>
            </Card.Root>
        </div>
    {/each}
    <div class="flex justify-between items-center mt-3">
        <div>
            {#if showEdit}
                <Button variant="destructive" onclick={deleteItems}>
                    <Trash />
                </Button>
                {#if selectedRows.length == 1}
                    <Button variant="secondary" onclick={editItem}>
                        <Pencil />
                    </Button>
                {/if}
            {/if}
        </div>
        <div class="flex gap-3">
            {#if !showEdit}
                <Button
                    variant="secondary"
                    onclick={() => {
                        showEdit = true;
                    }}
                >
                    <Pencil />
                </Button>
            {/if}
            <Button
                variant={showEdit ? "success" : "default"}
                onclick={() => {
                    if (showEdit) showEdit = false;
                    else showAdd = true;
                }}
            >
                {#if showEdit}
                    <Check />
                {:else}
                    <Plus />
                {/if}
            </Button>
        </div>
    </div>
</div>

<Sheet.Root bind:open={showAdd}>
    <!-- Add Buttton -->
    <Sheet.Content side="bottom" class="min-h-150 p-4" showCloseButton={false}>
        <Sheet.Header class="flex justify-between items-center">
            <Sheet.Title>{showEdit ? "Edit" : "Add"} Exercise</Sheet.Title>
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
            text={(showEdit ? "Edit" : "Add").concat(" Exercise")}
            onOverlay={true}
            onclick={() => {
                const result = exerciseManager.createEntry(exerciseId, metric);
                if (result.success) {
                    if (showEdit) {
                        const index = exercises.findIndex(
                            (e) => e.id == selectedRows[0],
                        );
                        exercises[index] = result.data;
                    } else {
                        exercises.push({ ...result.data });
                    }
                    persistChanges();
                    showAdd = false;
                    showEdit = false;
                } else alert(result.message);
            }}
        />
    </Sheet.Content>
</Sheet.Root>
