<script lang="ts">
    import { Input } from "$lib/components/ui/input/index.js";
    import { goto } from "$app/navigation";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { routineManager, type Routine } from "$lib/Routine.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import Field from "$lib/components/Field.svelte";

    let newRoutine = $state<Routine>(routineManager.createDefault());
</script>

<header>
    <BackBtn dest={"/routines"} />
    <h1>Create Routine</h1>
</header>

<form class="space-y-3">
    <section class="space-y-3">
        <Field label="Name">
            <Input bind:value={newRoutine.name} />
        </Field>
    </section>

    <section>
        <h2>Exercises</h2>
        <ExerciseManager exercises={newRoutine.exercises} />
    </section>
</form>

<section></section>
<ActionButton
    text="Add Routine"
    className="px-10"
    onclick={() => {
        const result = routineManager.addRoutine(newRoutine);

        alert(result.success ? "Routine Added!" : result.message);
        if (result.success) goto("/routines");
    }}
/>
