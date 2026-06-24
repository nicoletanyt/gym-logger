<script lang="ts">
    import { ChevronLeft, Trash2 } from "@lucide/svelte";
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import type { Routine } from "$lib/types";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { goto } from "$app/navigation";
    import BackBtn from "$lib/components/BackBtn.svelte";

    const id = page.params.id ?? "";

    const routinesData = $derived(
        JSON.parse(localStorage.getItem("ROUTINES_STORED") ?? "{}"),
    );

    const routine = $derived<Routine>(routinesData[id]);

    let newRoutine = $derived(routine.exercises);

    function deleteRoutine() {
        delete routinesData[id];
        localStorage.setItem("ROUTINES_STORED", JSON.stringify(routinesData));
        goto("/");
    }

    function saveRoutine() {
        routinesData[id].exercises = newRoutine;
        localStorage.setItem("ROUTINES_STORED", JSON.stringify(routinesData));
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

<ExerciseManager bind:exercises={newRoutine} />

<section>
    <Card.Root size="sm">
        <Card.Header>
            <Card.Title>Total Sessions</Card.Title>
        </Card.Header>
        <Card.Content>
            <p></p>
        </Card.Content>
    </Card.Root>
</section>

<section>
    <Button variant="secondary" class="bg-green-300" onclick={saveRoutine}>
        Save Routine
    </Button>
</section>
