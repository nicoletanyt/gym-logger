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
    import ActionButton from "$lib/components/ActionButton.svelte";

    let newRoutine = $state<Routine>(DEFAULT_ROUTINE);
</script>

<header>
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

    <section>
        <ExerciseManager bind:exercises={newRoutine.exercises} />
    </section>
</form>

<section></section>
<ActionButton
    text="Add Routine"
    className="px-10"
    onclick={() => {
        const result = routineManager.addRoutine(newRoutine);

        alert(result.success ? "Routine Added!" : result.message);
        if (result.success) goto("/");
    }}
/>
