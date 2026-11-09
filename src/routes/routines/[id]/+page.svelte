<script lang="ts">
    import { Check, Pencil, Trash2 } from "@lucide/svelte";
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
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
    <div class="flex justify-between">
        <BackBtn dest={"/routines"} />
        <div class="space-x-3">
            <ConfirmDialog onconfirm={deleteRoutine}>
                {#snippet trigger()}
                    <Trash2 />
                {/snippet}
            </ConfirmDialog>
            <Button
                variant={"outline"}
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
    {#if isEdit}
        <Input bind:value={routine.name} class="text-3xl py-5 px-2 font-bold" />
    {:else}
        <h1>{routine.name}</h1>
    {/if}
</header>

<section>
    <ExerciseManager bind:exercises={routine.exercises} readonly={!isEdit} />
</section>
{:else}
    <BackBtn dest="/routines" /><h1>Routine not found</h1><p>This routine may have been deleted or belongs to another account.</p>
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
