<script lang="ts">
    import { Input } from "$lib/components/ui/input/index.js";
    import { Combobox } from "$lib/components/ui/combobox/";
    import { goto } from "$app/navigation";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import {
        createDefaultSession,
        type Session,
        sessionManager,
    } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import Field from "$lib/components/Field.svelte";
    import { untrack } from "svelte";
    import { CalendarDays, ListChecks, Timer } from "@lucide/svelte";
    import FieldIcon from "$lib/components/FieldIcon.svelte";

    let newSession = $state<Session>(createDefaultSession());

    $effect(() => {
        newSession.routineId;
        untrack(() => sessionManager.applyRoutine(newSession));
    });
</script>

<div
    class="log-session mx-auto box-border flex h-full min-h-0 min-w-0 w-full max-w-2xl flex-col gap-4"
>
    <header class="flex items-center gap-4 space-y-0">
        <BackBtn />
        <h1 class="min-w-0 text-2xl sm:text-3xl">Log Session</h1>
    </header>

    <form
        class="box-border min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-1"
    >
        <section class="session-fields my-0 min-w-0 grid-cols-1 gap-5 space-y-0">
            <Field label="Duration (mins)" id="log-duration">
                <FieldIcon icon={Timer}><Input id="log-duration" type="number" class="pl-10" bind:value={newSession.duration} /></FieldIcon>
            </Field>
            <Field label="Date" id="log-date">
                <FieldIcon icon={CalendarDays}><Input id="log-date" type="date" class="pl-10" bind:value={newSession.date} /></FieldIcon>
            </Field>

            <Field label="Routine">
                <FieldIcon icon={ListChecks}><Combobox
                    noun="routine"
                    ariaLabel="Routine"
                    triggerClass="pl-10"
                    class="w-[var(--bits-popover-anchor-width)]"
                    options={routineManager.options}
                    bind:value={newSession.routineId}
                /></FieldIcon>
            </Field>
        </section>

        <section class="session-exercises min-w-0 grid-cols-1 space-y-3">
            <h2>Exercises</h2>
            <ExerciseManager bind:exercises={newSession.exercises} showImages />
        </section>
    </form>

    <ActionButton
        text="Add Session"
        className="static inset-auto my-0 w-full shrink-0"
        onclick={async () => {
            const result = await sessionManager.addSession({
                ...newSession,
                duration: Math.round(newSession.duration * 60),
            });

            alert(result.success ? "Session Added!" : result.message);
            if (result.success) goto("/");
        }}
    />
</div>

<style>
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
