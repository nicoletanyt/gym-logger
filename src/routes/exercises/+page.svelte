<script lang="ts">
    import ExerciseCard from "$lib/components/ExerciseCard.svelte";
    import ExerciseImagePicker from "$lib/components/ExerciseImagePicker.svelte";
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
    import { cloud } from "$lib/cloud.svelte";
    import { cn } from "$lib/utils";
    import { Check, Trash, X, Pencil } from "@lucide/svelte";

    let newExercise = $state<Exercise>(exerciseManager.createDefaultExercise());
    let imageFile = $state<File | null>(null);
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

    async function deleteSelected() {
        const result = await exerciseManager.removeExercises(selectedIds);
        if (result.success) toggleEdit();
        else alert(result.message);
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
                description={`This will remove ${selectedIds.length} exercise${selectedIds.length == 1 ? "" : "s"} from your exercises and routines. Your workout history will be kept.`}
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
    <Sheet.Content side="bottom" class="min-h-150 max-h-[90vh] overflow-y-auto p-4 pb-24" showCloseButton={false} inert={cloud.saving || cloud.needsReload || cloud.loading}>
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

            <ExerciseImagePicker bind:imageLink={newExercise.imageLink} bind:file={imageFile} />
            <Field label="Note">
                <Input bind:value={newExercise.note} />
            </Field>
        </section>

        <ActionButton
            text="Add Exercise"
            onOverlay={true}
            onclick={async () => {
                const result = await exerciseManager.addExercise(newExercise, imageFile);
                if (result.success) {
                    showAdd = false;
                    newExercise = exerciseManager.createDefaultExercise();
                    imageFile = null;
                } else alert(result.message);
            }}
        />
    </Sheet.Content>
</Sheet.Root>
