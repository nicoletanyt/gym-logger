<script lang="ts">
    import AddBtn from "$lib/components/AddBtn.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import RoutineCard from "$lib/components/RoutineCard.svelte";
    import { goto } from "$app/navigation";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { Check, Trash, Pencil } from "@lucide/svelte";
    import { cn } from "$lib/utils";
    import { buttonVariants } from "$lib/components/ui/button/index.js";

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

    async function deleteSelected() {
        // Each deletion is revision-checked. Stop at the first failure and retain
        // the remaining selection rather than pretending the batch was atomic.
        const selected = routineManager.routines.filter((r) => selectedIds.includes(r.id)).map((r) => ({ id: r.id, revision: r.revision }));
        for (const routine of selected) {
            const result = await routineManager.deleteRoutine(routine.id, routine.revision);
            if (!result.success) { alert(result.message); return; }
            selectedIds = selectedIds.filter((id) => id !== routine.id);
        }
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
    {#each routineManager.routines as routine (routine.id)}
        <RoutineCard
            {routine}
            selectable={isEditing}
            selected={selectedIds.includes(routine.id)}
            onselect={toggleSelect}
        />
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
