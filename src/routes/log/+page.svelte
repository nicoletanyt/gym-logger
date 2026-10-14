<script lang="ts">
    import { Input } from "$lib/components/ui/input/index.js";
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

    let newSession = $state<Session>(DEFAULT_SESSION);

    $effect(() => {
        sessionManager.applyRoutine(newSession);
    });
</script>

<div
    class="log-session box-border flex h-full min-h-0 min-w-0 w-full flex-col gap-4"
>
    <header>
        <BackBtn />
        <h1>Log Session</h1>
    </header>

    <form
        class="box-border min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-1"
    >
        <section class="session-fields my-0 min-w-0 grid-cols-1 space-y-3">
            <Field label="Duration (mins)" controlClass="min-w-0">
                <Input type="number" bind:value={newSession.duration} />
            </Field>
            <Field label="Date" controlClass="min-w-0">
                <Input type="date" bind:value={newSession.date} />
            </Field>

            <Field label="Routine" controlClass="min-w-0">
                <Combobox
                    noun="routine"
                    options={routineManager.options}
                    bind:value={newSession.routineId}
                />
            </Field>
        </section>

        <section class="session-exercises min-w-0 grid-cols-1 space-y-3">
            <h2>Exercises</h2>
            <ExerciseManager bind:exercises={newSession.exercises} />
        </section>
    </form>

    <ActionButton
        text="Add Session"
        className="static inset-auto my-0 w-full shrink-0"
        onclick={() => {
            const result = sessionManager.addSession({
                ...newSession,
                duration: newSession.duration * 60,
            });

            alert(result.success ? "Session Added!" : result.message);
            if (result.success) goto("/");
        }}
    />
</div>

<style>
    .session-fields > :global(div) {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        column-gap: 0.5rem;
    }

    .session-fields > :global(div > div) {
        width: 100%;
        min-width: 0;
    }

    .session-exercises > :global(div) {
        min-width: 0;
        grid-template-columns: minmax(0, 1fr);
    }

    .session-fields :global(button[role="combobox"]) {
        height: auto;
        min-height: 2.25rem;
        white-space: normal;
        overflow-wrap: anywhere;
        text-align: left;
    }

    .log-session :global([data-slot="card"]) {
        min-width: 0;
    }

    .log-session :global([data-slot="card-content"]) {
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .log-session :global([data-slot="card-content"] > div) {
        min-width: 0;
        overflow-wrap: anywhere;
    }
</style>
