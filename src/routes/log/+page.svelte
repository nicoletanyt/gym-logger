<script lang="ts">
    import { Star } from "@lucide/svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Combobox } from "$lib/components/ui/combobox/";
    import { goto } from "$app/navigation";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import {
        DEFAULT_SESSION,
        type Session,
        sessionManager,
    } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import Field from "$lib/components/Field.svelte";
    import StarDisplay from "$lib/components/StarDisplay.svelte";

    let newSession = $state<Session>(DEFAULT_SESSION);

    $effect(() => {
        sessionManager.applyRoutine(newSession);
    });
</script>

<header>
    <BackBtn />
    <h1>Log Session</h1>
</header>

<form class="space-y-3">
    <section class="space-y-3">
        <Field label="Duration (mins)">
            <Input type="number" bind:value={newSession.duration} />
        </Field>
        <Field label="Date">
            <Input type="date" bind:value={newSession.date} />
        </Field>
        <div class="flex justify-between">
            <Label class="shrink-0">Level of effort</Label>
            <StarDisplay bind:value={newSession.effort} className={"w-1/2"} />
        </div>

        <Field label="Routine">
            <Combobox
                noun="routine"
                options={routineManager.options}
                bind:value={newSession.routineId}
            />
        </Field>
    </section>

    <section>
        <h2>Exercises</h2>
        <ExerciseManager bind:exercises={newSession.exercises} />
    </section>
</form>

<ActionButton
    text="Add Session"
    onclick={() => {
        const result = sessionManager.addSession(newSession);

        alert(result.success ? "Session Added!" : result.message);
        if (result.success) goto("/");
    }}
/>
