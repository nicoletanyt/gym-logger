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

    const id = page.params.id ?? "";
    const routine = $state($state.snapshot(routineManager.getById(id)!));
    let isEdit = $state(false);

    function deleteRoutine() {
        routineManager.deleteRoutine(id);
        goto("/routines");
    }

    function updateRoutine() {
        routineManager.updateRoutine(routine);
    }
</script>

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
                onclick={() => {
                    isEdit = !isEdit;
                    if (!isEdit) updateRoutine();
                }}
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
    <ExerciseManager bind:exercises={routine.exercises} routineId={id} />
</section>

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
