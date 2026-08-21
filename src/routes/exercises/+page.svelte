<script lang="ts">
    import ExerciseCard from "$lib/components/ExerciseCard.svelte";
    import {
        exerciseManager,
        METRICS,
        type Exercise,
    } from "$lib/Exercise.svelte";
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import Input from "$lib/components/ui/input/input.svelte";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import Field from "$lib/components/Field.svelte";
    import AddBtn from "$lib/components/AddBtn.svelte";
    import Button, {
        buttonVariants,
    } from "$lib/components/ui/button/button.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import { cn } from "$lib/utils";
    import { Check, Trash, X, Pencil } from "@lucide/svelte";

    let newExercise = $state<Exercise>(exerciseManager.createDefaultExercise());
    let showAdd = $state(false);
    let isEditing = $state(false);
    let selectedIds = $state<string[]>([]);

    function toggleSelect(id: string) {
        selectedIds = selectedIds.includes(id)
            ? selectedIds.filter((x) => x != id)
            : [...selectedIds, id];
    }

    const allSelected = $derived(
        exerciseManager.exercises.length > 0 &&
            selectedIds.length == exerciseManager.exercises.length,
    );

    function toggleSelectAll() {
        selectedIds = allSelected
            ? []
            : exerciseManager.exercises.map((e) => e.id);
    }

    function toggleEdit() {
        isEditing = !isEditing;
        selectedIds = [];
    }

    function deleteSelected() {
        exerciseManager.removeExercises(selectedIds);
        sessionManager.removeExerciseEntries(selectedIds);
        routineManager.removeExerciseEntries(selectedIds);
        toggleEdit();
    }
</script>

<header class="flex justify-between items-center space-y-0">
    <h1>Exercises</h1>
    {#if exerciseManager.exercises.length > 0}
        <Button
            variant="outline"
            aria-label="Edit exercises"
            onclick={toggleEdit}
        >
            {#if isEditing}
                <Check />
            {:else}
                <Pencil />
            {/if}
        </Button>
    {/if}
</header>

<!-- List of Exercises -->
<section>
    {#each exerciseManager.exercises as item}
        <ExerciseCard
            exercise={item}
            selectable={isEditing}
            selected={selectedIds.includes(item.id)}
            onselect={toggleSelect}
        />
    {:else}
        <p>No Exercises Added</p>
    {/each}
</section>

{#if !isEditing}
    <AddBtn
        onclick={() => {
            showAdd = true;
        }}
    />
{:else}
    <div
        class="fixed bottom-24 left-11 right-11 z-10 flex justify-between items-center bg-background rounded-2xl px-5 py-3 shadow-md"
    >
        <Button variant="ghost" size="sm" onclick={toggleSelectAll}>
            {allSelected ? "Deselect All" : "Select All"}
        </Button>
        {#if selectedIds.length > 0}
            <ConfirmDialog
                title="Delete Exercises?"
                description={`This will permanently delete ${selectedIds.length} exercise${selectedIds.length == 1 ? "" : "s"} and all related data, including every entry of it in your sessions and routines.`}
                onconfirm={deleteSelected}
                buttonVar="destructive"
            >
                {#snippet trigger()}
                    <span class="inline-flex items-center gap-1.5">
                        <Trash class="size-4" />
                        Delete ({selectedIds.length})
                    </span>
                {/snippet}
            </ConfirmDialog>
        {:else}
            <span
                class={cn(
                    buttonVariants({ variant: "destructive" }),
                    "opacity-40 pointer-events-none select-none",
                )}
            >
                <Trash class="size-4" />
                Delete
            </span>
        {/if}
    </div>
{/if}

<Sheet.Root bind:open={showAdd}>
    <!-- Add Buttton -->
    <Sheet.Content side="bottom" class="min-h-150 p-4" showCloseButton={false}>
        <Sheet.Header class="flex justify-between">
            <Sheet.Title>Create New Exercise</Sheet.Title>
            <Button
                variant={"ghost"}
                size="icon-sm"
                onclick={() => (showAdd = false)}
            >
                <X />
            </Button>
        </Sheet.Header>
        <section class="px-4 my-0">
            <Field label="Name">
                <Input bind:value={newExercise.name} />
            </Field>
            <Field label="Exercise Type">
                <Combobox
                    noun="type"
                    options={Object.values(METRICS).map((m) => {
                        return {
                            value: m.name.toLowerCase(),
                            label: m.name,
                        };
                    })}
                    bind:value={newExercise.metricType}
                />
            </Field>

            <Field label="Image Link">
                <Input bind:value={newExercise.imageLink} />
            </Field>
            <Field label="Note">
                <Input bind:value={newExercise.note} />
            </Field>
        </section>

        <ActionButton
            text="Add Exercise"
            onOverlay={true}
            onclick={() => {
                exerciseManager.addExercise(newExercise);
                exerciseManager.updateData();
                showAdd = false;
            }}
        />
    </Sheet.Content>
</Sheet.Root>
