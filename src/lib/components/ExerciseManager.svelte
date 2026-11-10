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
    import { Check, Dumbbell, Layers3, Pencil, Plus, Repeat2, Route, Search, Timer, Trash, XIcon } from "@lucide/svelte";
    import MetricTypeTag from "./MetricTypeTag.svelte";
    import Button from "./ui/button/button.svelte";
    import Input from "./ui/input/input.svelte";
    import Field from "./Field.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import { cloud } from "$lib/cloud.svelte";
    import { pushState } from "$app/navigation";
    import { page } from "$app/state";
    import { takeCreatedExercise } from "$lib/exercise-creation";
    import ExerciseEntryContent from "./ExerciseEntryContent.svelte";
    import ErrorAlert from "./ErrorAlert.svelte";
    import ExerciseCard from "./ExerciseCard.svelte";

    let {
        exercises = $bindable(),
        readonly = false,
        showImages = false,
        cardStyle = "default",
    }: { exercises: ExerciseEntry[]; readonly?: boolean; showImages?: boolean; cardStyle?: "default" | "exercise" } = $props();
    const fieldId = $props.id();
    let metric = $state<ExerciseMetric>(createMetric("weight"));
    let exerciseId = $state("");
    let previousMetric = $state<ExerciseMetric | null>(null);
    let error = $state("");
    let attempted = $state(false);
    const selectedExercise = $derived(exerciseManager.getById(exerciseId));

    let selectedRows = $state<string[]>([]);

    let showAdd = $state(false);
    let showEdit = $state(false);
    let creationToken = $state<string | null>(null);
    let creationVisible = false;

    $effect(() => {
        if (readonly) {
            showEdit = false;
            showAdd = false;
            selectedRows = [];
        }
    });

    function deleteItems() {
        exercises = exercises.filter((e) => !selectedRows.includes(e.id));
        selectedRows = [];
    }

    function editItem() {
        const selected = exercises.find((e) => e.id == selectedRows[0])!;
        exerciseId = selected.exerciseId;
        metric = { ...selected.metric };
        previousMetric = null;
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
        previousMetric = Object.values(sessionManager.sessions).some((session) =>
            session.exercises.some((entry) => entry.exerciseId === exerciseId),
        ) ? { ...metric } : null;
        attempted = false;
        error = "";
    }

    function readNumber(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        return Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0;
    }

    function selectValue(event: FocusEvent) {
        (event.currentTarget as HTMLInputElement).select();
    }

    function formatPrevious(value: ExerciseMetric) {
        const parts = [`${value.sets} sets`];
        if ("reps" in value) parts.push(`${value.reps} reps`);
        if ("weight" in value) parts.push(`${value.weight} kg`);
        if ("duration" in value) parts.push(`${value.duration} mins`);
        if ("distance" in value) parts.push(`${value.distance} km`);
        return parts.join(" · ");
    }

    function saveEntry(event: SubmitEvent) {
        event.preventDefault();
        attempted = true;
        const result = exerciseManager.createEntry(exerciseId, metric);
        if (!result.success) {
            if (!exerciseId) error = "Choose an exercise first.";
            else if (!Number.isInteger(metric.sets) || metric.sets <= 0) error = "Enter a whole number of sets greater than zero.";
            else if ("reps" in metric && (!Number.isInteger(metric.reps) || metric.reps <= 0)) error = "Enter a whole number of reps greater than zero.";
            else if ("weight" in metric && (!Number.isFinite(metric.weight) || metric.weight <= 0)) error = "Enter a weight greater than zero.";
            else if ("duration" in metric && (!Number.isFinite(metric.duration) || metric.duration <= 0)) error = "Enter a duration greater than zero.";
            else if ("distance" in metric && (!Number.isFinite(metric.distance) || metric.distance <= 0)) error = "Enter a distance greater than zero.";
            else error = result.message;
            return;
        }
        if (showEdit) {
            const index = exercises.findIndex((e) => e.id === selectedRows[0]);
            exercises[index] = { ...exercises[index], exerciseId: result.data.exerciseId, metric: result.data.metric,
                ...(exercises[index].exerciseId !== result.data.exerciseId ? { exerciseName: undefined, avgDuration: undefined } : {}) };
        } else {
            exercises.push({ ...result.data });
        }
        showAdd = false;
        showEdit = false;
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
            previousMetric = null;
            attempted = false;
            error = "";
        }
        if (!showEdit) {
            selectedRows = [];
        }
    });
</script>

<div class="grid gap-3">
    {#each exercises as e}
        {@const exercise = exerciseManager.getById(e.exerciseId)}
        {#if cardStyle === "exercise"}
            <ExerciseCard
                exercise={{ ...exercise, id: e.exerciseId, name: e.exerciseName ?? exercise?.name ?? "Unknown exercise", metricType: e.metric.type }}
                metric={e.metric}
                navigable={readonly && !!exercise && !exercise.archived}
                selectable={!readonly && showEdit}
                selected={showEdit && selectedRows.includes(e.id)}
                onselect={() => selectedRows = selectedRows.includes(e.id) ? selectedRows.filter((id) => id !== e.id) : [...selectedRows, e.id]}
            />
        {:else}
        <div class="flex gap-2 items-center">
            {#if !readonly && showEdit}
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
                    if (!readonly && showEdit) {
                        selectedRows = selectedRows.includes(e.id)
                            ? selectedRows.filter((id) => id != e.id)
                            : [...selectedRows, e.id];
                    }
                }}
            >
                <Card.Content>
                    <ExerciseEntryContent entry={e} {showImages} />
                </Card.Content>
            </Card.Root>
        </div>
        {/if}
    {/each}
    {#if !readonly}
    <div class="flex justify-between items-center mt-3">
        <div>
            {#if showEdit}
                <Button variant="destructive" aria-label="Remove selected exercises" onclick={deleteItems}>
                    <Trash />
                </Button>
                {#if selectedRows.length == 1}
                    <Button variant="secondary" aria-label="Edit selected exercise" onclick={editItem}>
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
    <Sheet.Content side="bottom" class="mx-auto flex max-h-[90dvh] min-h-[min(34rem,90dvh)] w-full max-w-2xl gap-0 overflow-hidden rounded-t-2xl p-0" showCloseButton={false} inert={cloud.saving || cloud.needsReload || cloud.loading}>
        <Sheet.Header class="flex shrink-0 items-center justify-between px-6 pt-5 pb-4">
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
        <form class="flex min-h-0 flex-1 flex-col" onsubmit={saveEntry} novalidate>
        <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <section class="my-0 gap-5 space-y-0">
            <Field label="Exercise">
                <div class="relative">
                <Search aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <Combobox
                    noun="exercise"
                    ariaLabel="Exercise"
                    invalid={attempted && !exerciseId}
                    triggerClass="pl-10"
                    class="w-[var(--bits-popover-anchor-width)]"
                    options={exerciseManager.exercises.map((m) => ({
                        value: m.id,
                        label: m.name,
                    }))}
                    bind:value={exerciseId}
                    onChange={() => onExerciseChanged(exerciseId)}
                    onCreate={onExerciseCreated}
                />
                </div>
            </Field>
            {#if selectedExercise}
            <div class="flex min-w-0 flex-wrap items-center gap-3">
                <MetricTypeTag metric={METRICS[selectedExercise.metricType]} />
                {#if previousMetric}
                    <p class="min-w-0 text-xs text-muted-foreground">Last session: {formatPrevious(previousMetric)}</p>
                {/if}
            </div>
            <div class="grid grid-cols-2 gap-4">
                <Field label="Sets" id={`${fieldId}-sets`}>
                    <div class="relative">
                        <Layers3 aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id={`${fieldId}-sets`} type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 3" class="h-12 pl-10" value={metric.sets || undefined} oninput={(event) => metric.sets = readNumber(event)} onfocus={selectValue} aria-invalid={attempted && (!Number.isInteger(metric.sets) || metric.sets <= 0)} />
                    </div>
                </Field>
                {#if "reps" in metric}
                <Field label="Reps" id={`${fieldId}-reps`}>
                    <div class="relative">
                        <Repeat2 aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id={`${fieldId}-reps`} type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 10" class="h-12 pl-10" value={metric.reps || undefined} oninput={(event) => { if ("reps" in metric) metric.reps = readNumber(event); }} onfocus={selectValue} aria-invalid={attempted && (!Number.isInteger(metric.reps) || metric.reps <= 0)} />
                    </div>
                </Field>
                {/if}
            </div>
            {#if metric.type == "weight"}
                <Field label="Weight (kg)" id={`${fieldId}-weight`}>
                    <div class="relative">
                        <Dumbbell aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id={`${fieldId}-weight`} type="number" inputmode="decimal" min="0" step="any" placeholder="e.g. 20" class="h-12 pl-10" value={metric.weight || undefined} oninput={(event) => { if (metric.type === "weight") metric.weight = readNumber(event); }} onfocus={selectValue} aria-invalid={attempted && (!Number.isFinite(metric.weight) || metric.weight <= 0)} />
                    </div>
                </Field>
            {:else if metric.type == "duration" || metric.type == "cardio"}
                <div class={metric.type === "cardio" ? "grid grid-cols-2 gap-4" : "grid gap-4"}>
                <Field label="Duration (mins)" id={`${fieldId}-duration`}>
                    <div class="relative">
                        <Timer aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id={`${fieldId}-duration`} type="number" inputmode="decimal" min="0" step="any" placeholder="e.g. 30" class="h-12 pl-10" value={metric.duration || undefined} oninput={(event) => { if ("duration" in metric) metric.duration = readNumber(event); }} onfocus={selectValue} aria-invalid={attempted && (!Number.isFinite(metric.duration) || metric.duration <= 0)} />
                    </div>
                </Field>
                {#if metric.type == "cardio"}
                <Field label="Distance (km)" id={`${fieldId}-distance`}>
                    <div class="relative">
                        <Route aria-hidden="true" class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id={`${fieldId}-distance`} type="number" inputmode="decimal" min="0" step="any" placeholder="e.g. 5" class="h-12 pl-10" value={metric.distance || undefined} oninput={(event) => { if (metric.type === "cardio") metric.distance = readNumber(event); }} onfocus={selectValue} aria-invalid={attempted && (!Number.isFinite(metric.distance) || metric.distance <= 0)} />
                    </div>
                </Field>
                {/if}
                </div>
            {/if}
            {:else}
                <p class="text-sm text-muted-foreground">Choose an exercise to enter its sets and details.</p>
            {/if}
        </section>
        </div>
        <div class="shrink-0 bg-background px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button type="submit" variant="secondary" class="h-auto w-full bg-green-300 px-6 py-4 text-zinc-950 hover:bg-green-400" disabled={cloud.saving || cloud.needsReload || cloud.loading}>
                {#if showEdit}<Check />{:else}<Plus />{/if}
                {showEdit ? "Save Exercise" : "Add Exercise"}
            </Button>
        </div>
        </form>
        {#if error}<ErrorAlert message={error} ondismiss={() => (error = "")} />{/if}
    </Sheet.Content>
</Sheet.Root>
