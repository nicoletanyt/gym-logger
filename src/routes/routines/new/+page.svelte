<script lang="ts">
    import { ChevronLeft, Plus } from "@lucide/svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import type { Routine } from "$lib/types";
    import { goto } from "$app/navigation";
    import { DEFAULT_ROUTINE } from "$lib/constants";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";

    let routineData = $state<Routine>(DEFAULT_ROUTINE);

    function addRoutine() {
        const currentRoutines = JSON.parse(
            localStorage.getItem("ROUTINES_STORED") ?? "{}",
        );
        currentRoutines[routineData.id] = routineData;

        localStorage.setItem(
            "ROUTINES_STORED",
            JSON.stringify(currentRoutines),
        );
        alert("Routine Added!");
        goto("/");
    }
</script>

<header class="space-y-5 mb-10">
    <Button variant="outline" href="/">
        <ChevronLeft />
        Back
    </Button>
    <h1>Create Routine</h1>
</header>

<form class="space-y-3">
    <section class="space-y-3">
        <div class="flex justify-between">
            <Label class="shrink-0">Name</Label>
            <Input class="w-1/2" bind:value={routineData.name} />
        </div>
    </section>

    <section class="space-y-5">
        <ExerciseManager bind:exercises={routineData.exercises} />
    </section>
</form>

<section>
    <Button variant="secondary" class="bg-green-300" onclick={addRoutine}>
        <Plus />
        Add Routine
    </Button>
</section>
