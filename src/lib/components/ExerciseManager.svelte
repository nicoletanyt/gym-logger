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
    import { sessionManager } from "$lib/Session.svelte";
    import { cloud } from "$lib/cloud.svelte";
    import { pushState } from "$app/navigation";
    import { page } from "$app/state";
    import { takeCreatedExercise } from "$lib/exercise-creation";

    let {
        exercises = $bindable(),
        readonly = false,
    }: { exercises: ExerciseEntry[]; readonly?: boolean } = $props();
    let metric = $state<ExerciseMetric>(createMetric("weight"));
    let exerciseId = $state("");

    let selectedRows = $state<string[]>([]);

    let showAdd = $state(false);
    let showEdit = $state(false);
    let creationToken = $state<string | null>(null);
    let creationVisible = false;

    function deleteItems() {
        exercises = exercises.filter((e) => !selectedRows.includes(e.id));
        selectedRows = [];
    }

    function editItem() {
        const selected = exercises.find((e) => e.id == selectedRows[0])!;
        exerciseId = selected.exerciseId;
        metric = { ...selected.metric };
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
        metric = sessionManager.getLatestExercise(exerciseId);
    }

    function onExerciseCreated(name: string) {
        const token = crypto.randomUUID();
        showAdd = false;
        creationVisible = false;
        creationToken = token;
        pushState("/exercises/new", { createExercise: { name, token } });
    }

    $effect(() => {
        if (!creationToken) return;
        if (page.state.createExercise?.token === creationToken) {
            creationVisible = true;
            return;
        }
        if (!creationVisible) return;
        const createdId = takeCreatedExercise(creationToken);
        creationVisible = false;
        showAdd = true;
        if (createdId) {
            exerciseId = createdId;
            const created = exerciseManager.getById(createdId);
            if (created) metric = createMetric(created.metricType);
        }
    });

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
            <Card.Root
                size={"sm"}
                class="mx-px flex-1 {showEdit && selectedRows.includes(e.id) ? 'border-primary' : ''}"
                onclick={() => {
                    if (showEdit) {
                        selectedRows = selectedRows.includes(e.id)
                            ? selectedRows.filter((id) => id != e.id)
                            : [...selectedRows, e.id];
                    }
                }}
            >
                <Card.Content class="flex justify-between items-center">
                    <div class="space-y-2">
                        <p class="font-bold">{e.exerciseName ?? exercise?.name ?? "Unknown exercise"}</p>
                        <div class="flex gap-2 items-center">
                            <MetricDisplay metric={e.metric} />
                        </div>
                    </div>
                    <!-- TAG -->
                    <MetricTypeTag
                        metric={METRICS[e.metric.type]}
                        size="sm"
                    />
                </Card.Content>
            </Card.Root>
        </div>
    {/each}
    {#if !readonly}
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
                    aria-label="Edit exercises"
                    onclick={() => {
                        showEdit = true;
                    }}
                >
                    <Pencil />
                </Button>
            {/if}
            <Button
                variant={showEdit ? "success" : "default"}
                aria-label={showEdit ? "Done editing exercises" : "Add exercise"}
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
    {/if}
</div>

<Sheet.Root bind:open={showAdd}>
    <!-- Add Buttton -->
    <Sheet.Content side="bottom" class="min-h-150 max-h-[90vh] overflow-y-auto p-4" showCloseButton={false} inert={cloud.saving || cloud.needsReload || cloud.loading}>
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
                    options={exerciseManager.exercises.map((m) => ({
                        value: m.id,
                        label: m.name,
                    }))}
                    bind:value={exerciseId}
                    onChange={() => onExerciseChanged(exerciseId)}
                    onCreate={onExerciseCreated}
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
                        // Metric edits retain entry identity and historical name snapshots.
                        exercises[index] = { ...exercises[index], exerciseId: result.data.exerciseId, metric: result.data.metric,
                            ...(exercises[index].exerciseId !== result.data.exerciseId ? { exerciseName: undefined, avgDuration: undefined } : {}) };
                    } else {
                        exercises.push({ ...result.data });
                    }
                    showAdd = false;
                    showEdit = false;
                } else alert(result.message);
            }}
        />
    </Sheet.Content>
</Sheet.Root>
