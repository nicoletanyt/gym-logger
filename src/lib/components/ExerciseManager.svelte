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
    import Label from "./ui/label/label.svelte";
    import Input from "./ui/input/input.svelte";

    let { exercises }: { exercises: ExerciseEntry[] } = $props();
    let metricType = $state<MetricType>("weight");
    let metric = $state<ExerciseMetric>({
        type: "weight",
        sets: 3,
        weight: 11,
        reps: 15,
    });
    let exerciseId = $state("");

    let showAdd = $state(false);

    $effect(() => {
        switch (metricType) {
            case "weight":
                metric = { type: "weight", sets: 0, weight: 0, reps: 0 };
                break;
            case "reps":
                metric = { type: "reps", sets: 0, reps: 0 };
                break;
            case "duration":
                metric = { type: "duration", sets: 0, duration: 0 };
                break;
            case "cardio":
                metric = { type: "cardio", sets: 0, duration: 0, distance: 0 };
                break;
        }
    });
</script>

<div class="grid gap-3">
    {#each exercises as e}
        {@const exercise = exerciseManager.getById(e.exerciseId)}
        <Card.Root size={"sm"} onclick={() => {}}>
            <Card.Content class="flex justify-between items-center">
                <div class="space-y-2">
                    <p class="font-bold">{exercise.name}</p>
                    <div class="flex gap-2 items-center text-xs">
                        {#each Object.entries(e.metric) as [label, value], key}
                            {#if label != "type"}
                                <p>{value} {label}</p>
                                {#if key != Object.values(e.metric).length - 1}
                                    <span
                                        class="size-1 rounded-full bg-muted-foreground"
                                    ></span>
                                {/if}
                            {/if}
                        {/each}
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
                    bind:value={exerciseId}
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
                <Input type="number" class="w-1/2" bind:value={metric.sets} />
            </div>
            {#if metric.type == "weight"}
                <div class="flex justify-between">
                    <Label>Weight</Label>
                    <Input
                        type="number"
                        class="w-1/2"
                        bind:value={metric.weight}
                    />
                </div>
                <div class="flex justify-between">
                    <Label>Reps</Label>
                    <Input
                        type="number"
                        class="w-1/2"
                        bind:value={metric.reps}
                    />
                </div>
            {:else if metric.type == "reps"}
                <div class="flex justify-between">
                    <Label>Reps</Label>
                    <Input
                        type="number"
                        class="w-1/2"
                        bind:value={metric.reps}
                    />
                </div>
            {:else if metric.type == "duration"}
                <div class="flex justify-between">
                    <Label>Duration</Label>
                    <Input
                        type="number"
                        class="w-1/2"
                        bind:value={metric.duration}
                    />
                </div>
            {:else if metric.type == "cardio"}
                <div class="flex justify-between">
                    <Label>Duration</Label>
                    <Input
                        type="number"
                        class="w-1/2"
                        bind:value={metric.duration}
                    />
                </div>
                <div class="flex justify-between">
                    <Label>Distance</Label>
                    <Input
                        type="number"
                        class="w-1/2"
                        bind:value={metric.distance}
                    />
                </div>
            {/if}
        </section>

        <ActionButton
            text="Add Exercise"
            className="p-8"
            onclick={() => {
                const newEntry = exerciseManager.createExerciseEntry(
                    exerciseId,
                    metric,
                );
                exercises.push(newEntry);
                showAdd = false;
            }}
        />
    </Sheet.Content>
</Sheet.Root>
