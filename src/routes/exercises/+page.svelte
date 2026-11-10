<script lang="ts">
    import ExerciseCard from "$lib/components/ExerciseCard.svelte";
    import { exerciseManager } from "$lib/Exercise.svelte";
    import { goto } from "$app/navigation";
    import AddBtn from "$lib/components/AddBtn.svelte";
    import Button, {
        buttonVariants,
    } from "$lib/components/ui/button/button.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { cn } from "$lib/utils";
    import { Check, Trash, Pencil } from "@lucide/svelte";

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
        onclick={() => goto("/exercises/new")}
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
