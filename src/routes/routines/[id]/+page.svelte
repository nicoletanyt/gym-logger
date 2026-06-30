<script lang="ts">
    import { Trash2 } from "@lucide/svelte";
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { goto } from "$app/navigation";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { routineManager } from "$lib/Routine.svelte";

    const id = page.params.id ?? "";

    const routine = $state(routineManager.getById(id));

    function deleteRoutine() {
        routineManager.deleteRoutine(id);
        goto("/");
    }

    function updateRoutine() {
        routineManager.updateRoutine(routine);
        goto("/");
    }
</script>

<header class="space-y-5 mb-10">
    <div class="flex justify-between">
        <BackBtn />
        <ConfirmDialog onconfirm={deleteRoutine}>
            {#snippet trigger()}
                <Trash2 />
            {/snippet}
        </ConfirmDialog>
    </div>
    <h1>{routine.name}</h1>
</header>

<ExerciseManager bind:exercises={routine.exercises} />

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

<section class="space-y-5 fixed w-full left-0 bottom-0 px-10">
    <Button variant="secondary" class="bg-green-300" onclick={updateRoutine}>
        Save Routine
    </Button>
</section>
