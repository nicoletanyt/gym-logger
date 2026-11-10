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
    import { Check, Trash, Pencil, Plus, Search } from "@lucide/svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import FieldIcon from "$lib/components/FieldIcon.svelte";

    let isEditing = $state(false);
    let selectedIds = $state<string[]>([]);
    let search = $state("");
    const filteredExercises = $derived(exerciseManager.exercises.filter((exercise) =>
        exercise.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    ));

    function toggleSelect(id: string) {
        selectedIds = selectedIds.includes(id)
            ? selectedIds.filter((x) => x != id)
            : [...selectedIds, id];
    }

    const allSelected = $derived(
        filteredExercises.length > 0 &&
            filteredExercises.every((exercise) => selectedIds.includes(exercise.id)),
    );

    function toggleSelectAll() {
        selectedIds = allSelected
            ? selectedIds.filter((id) => !filteredExercises.some((exercise) => exercise.id === id))
            : [...new Set([...selectedIds, ...filteredExercises.map((exercise) => exercise.id)])];
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

<FieldIcon icon={Search}>
    <Input type="search" aria-label="Search exercises" placeholder="Search exercises…" class="h-11 pl-10" bind:value={search} />
</FieldIcon>

<!-- List of Exercises -->
<section>
    {#each filteredExercises as item}
        <ExerciseCard
            exercise={item}
            selectable={isEditing}
            selected={selectedIds.includes(item.id)}
            onselect={toggleSelect}
        />
    {:else}
        <div class="grid justify-items-center gap-4 py-10 text-center">
            {#if exerciseManager.exercises.length > 0}
                <p class="text-muted-foreground" role="status">No exercises match your search.</p>
                <Button variant="outline" class="min-h-11" onclick={() => search = ""}>Clear search</Button>
            {:else}
                <p class="text-muted-foreground">No Exercises Added</p>
                <Button href="/exercises/new" class="min-h-11"><Plus aria-hidden="true" />Add Exercise</Button>
            {/if}
        </div>
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
