<script lang="ts">
    import { Check, Pencil, PencilLine, Trash2 } from "@lucide/svelte";
    import FieldIcon from "$lib/components/FieldIcon.svelte";
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import WorkoutCardMeta from "$lib/components/WorkoutCardMeta.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { goto } from "$app/navigation";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import { untrack } from "svelte";
    import type { Routine } from "$lib/Routine.svelte";
    import { cloud } from "$lib/cloud.svelte";

    const id = $derived(page.params.id ?? "");
    let routine = $state<Routine | undefined>();
    let isEdit = $state(false);
    $effect(() => {
        const routeId = id;
        untrack(() => {
            const original = routineManager.getById(routeId);
            routine = original ? structuredClone($state.snapshot(original)) : undefined;
            isEdit = false;
        });
    });

    async function deleteRoutine() {
        if (!routine) return;
        const result = await routineManager.deleteRoutine(id, routine.revision);
        if (result.success) goto("/routines");
        else alert(result.message);
    }

    async function toggleEdit() {
        if (!routine) return;
        if (!isEdit) {
            const latest = routineManager.getById(id);
            routine = latest ? structuredClone($state.snapshot(latest)) : undefined;
            isEdit = Boolean(routine); return;
        }
        const result = await routineManager.updateRoutine(routine);
        if (result.success) {
            if (!cloud.needsReload) routine = structuredClone($state.snapshot(routineManager.getById(id)));
            isEdit = false;
        } else alert(result.message);
    }
</script>

{#if routine}
<header>
    <div class="flex items-center gap-4">
        <BackBtn dest={"/routines"} />
        {#if isEdit}
            <FieldIcon icon={PencilLine} class="min-w-0 flex-1"><Input bind:value={routine.name} aria-label="Routine name" class="min-w-0 text-2xl sm:text-3xl py-5 pl-10 pr-2 font-bold" /></FieldIcon>
        {:else}
            <h1 class="min-w-0 flex-1 break-words text-2xl sm:text-3xl">{routine.name}</h1>
        {/if}
        <div class="flex shrink-0 gap-3">
            <ConfirmDialog onconfirm={deleteRoutine}>
                {#snippet trigger()}
                    <Trash2 />
                {/snippet}
            </ConfirmDialog>
            <Button
                variant={"outline"}
                aria-label={isEdit ? "Save routine" : "Edit routine"}
                disabled={cloud.saving || cloud.loading || cloud.needsReload}
                onclick={toggleEdit}
            >
                {#if isEdit}
                    <Check />
                {:else}
                    <Pencil />
                {/if}
            </Button>
        </div>
    </div>
</header>

<section aria-labelledby="routine-exercises-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="routine-exercises-heading" class="text-xl">Exercises</h2>
        <div aria-live="polite"><WorkoutCardMeta exerciseCount={routine.exercises.length} /></div>
    </div>
    <ExerciseManager bind:exercises={routine.exercises} readonly={!isEdit} cardStyle="exercise" />
</section>
{:else}
    <header class="flex items-center gap-4 space-y-0"><BackBtn dest="/routines" /><h1 class="min-w-0 text-2xl sm:text-3xl">Routine not found</h1></header><p>This routine may have been deleted or belongs to another account.</p>
{/if}

<!-- TODO: -->
<!-- <section> -->
<!--     <Card.Root size="sm"> -->
<!--         <Card.Header> -->
<!--             <Card.Title>Total Sessions</Card.Title> -->
<!--         </Card.Header> -->
<!--         <Card.Content> -->
<!--             <p></p> -->
<!--         </Card.Content> -->
<!--     </Card.Root> -->
<!-- </section> -->
