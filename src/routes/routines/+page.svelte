<script lang="ts">
    import AddBtn from "$lib/components/AddBtn.svelte";
    import { routineManager, type Routine } from "$lib/Routine.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import { goto } from "$app/navigation";
    import { exerciseManager } from "$lib/Exercise.svelte";
    import MetricDisplay from "$lib/components/MetricDisplay.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { Check, Trash, Pencil } from "@lucide/svelte";
    import { cn } from "$lib/utils";
    import { buttonVariants } from "$lib/components/ui/button/index.js";

    let newRoutine = $state<Routine>(routineManager.createDefault());
    let isEditing = $state(false);
    let selectedIds = $state<string[]>([]);

    function toggleSelect(id: string) {
        selectedIds = selectedIds.includes(id)
            ? selectedIds.filter((x) => x != id)
            : [...selectedIds, id];
    }

    const allSelected = $derived(
        routineManager.routines.length > 0 &&
            selectedIds.length == routineManager.routines.length,
    );

    function toggleSelectAll() {
        selectedIds = allSelected
            ? []
            : routineManager.routines.map((e) => e.id);
    }

    function toggleEdit() {
        isEditing = !isEditing;
        selectedIds = [];
    }

    function deleteSelected() {
        routineManager.routines = routineManager.routines.filter(
            (r) => !selectedIds.includes(r.id),
        );
        routineManager.updateData();
        toggleEdit();
    }
</script>

<header class="flex justify-between items-center space-y-0">
    <h1>Routines</h1>
    {#if routineManager.routines.length > 0}
        <Button
            variant="outline"
            aria-label="Edit routines"
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

<!-- List of Routines -->
<section>
    {#each routineManager.routines as routine}
        <div class="flex gap-3 items-center">
            {#if isEditing}
                <Checkbox
                    class="size-5"
                    checked={selectedIds.includes(routine.id)}
                    onCheckedChange={() => {
                        toggleSelect(routine.id);
                    }}
                />
            {/if}
            <Card.Root
                class="flex-1 {selectedIds.includes(routine.id) ? 'border-primary' : ''}"
                onclick={() => {
                    if (isEditing) toggleSelect(routine.id);
                    else goto("/routines/" + routine.id);
                }}
            >
                <Card.Header>
                    <Card.Title class="flex justify-between">
                        <span class="font-bold">
                            {routine.name}
                        </span>
                    </Card.Title>
                </Card.Header>

                <Card.Content class="space-y-2">
                    {#each routine.exercises as entry, key}
                        {@const exercise = exerciseManager.getById(
                            entry.exerciseId,
                        )}
                        <div class="flex justify-between items-center">
                            <div>
                                <span>{key + 1}.</span>
                                <span class="text-base">{exercise.name}</span>
                            </div>
                            <MetricDisplay exercise={entry} size="lg" />
                        </div>
                    {/each}
                </Card.Content>
            </Card.Root>
        </div>
    {:else}
        <p>No Routines Created</p>
    {/each}
</section>

{#if !isEditing}
<AddBtn
    onclick={() => {
        goto("/routines/new");
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
            title="Delete Routines?"
            description={`This will permanently delete ${selectedIds.length} routine${selectedIds.length == 1 ? "" : "s"} and all related data.`}
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
