<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { goto } from "$app/navigation";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import {
        DEFAULT_ROUTINE,
        routineManager,
        type Routine,
    } from "$lib/Routine.svelte";

    let newRoutine = $state<Routine>(DEFAULT_ROUTINE);
</script>

<header class="space-y-5 mb-10">
    <BackBtn />
    <h1>Create Routine</h1>
</header>

<form class="space-y-3">
    <section class="space-y-3">
        <div class="flex justify-between">
            <Label class="shrink-0">Name</Label>
            <Input class="w-1/2" bind:value={newRoutine.name} />
        </div>
    </section>

    <ExerciseManager bind:exercises={newRoutine.exercises} />
</form>

<section class="space-y-5 fixed w-full left-0 bottom-0 px-10">
    <Button
        variant="secondary"
        class="bg-green-300"
        onclick={() => {
            const result = routineManager.addRoutine(newRoutine);

            alert(result.success ? "Routine Added!" : result.message);
            if (result.success) goto("/");
        }}
    >
        <Plus />
        Add Routine
    </Button>
</section>
