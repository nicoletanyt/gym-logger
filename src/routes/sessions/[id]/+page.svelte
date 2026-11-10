<script lang="ts">
    import { Check, ListChecks, Pencil, Timer, Trash2 } from "@lucide/svelte";
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import WorkoutCardMeta from "$lib/components/WorkoutCardMeta.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import { Combobox } from "$lib/components/ui/combobox/";
    import { goto } from "$app/navigation";
    import { untrack } from "svelte";
    import type { Session } from "$lib/Session.svelte";
    import { cloud } from "$lib/cloud.svelte";
    import Field from "$lib/components/Field.svelte";
    import FieldIcon from "$lib/components/FieldIcon.svelte";

    const id = $derived(page.params.id ?? "");
    let session = $state<Session | undefined>();
    let isEdit = $state(false);
    let durationMinutes = $state(0);
    const routineOptions = $derived.by(() => {
        const options = routineManager.options;
        const current = session;
        if (current && !options.some((option) => option.value === current.routineId)) {
            return [...options, { value: current.routineId, label: current.routineName ?? "Unavailable routine" }];
        }
        return options;
    });
    $effect(() => {
        const routeId = id;
        untrack(() => {
            const original = sessionManager.sessions[routeId];
            session = original ? structuredClone($state.snapshot(original)) : undefined;
            durationMinutes = (original?.duration ?? 0) / 60;
            isEdit = false;
        });
    });

    async function toggleEdit() {
        if (!session) return;
        if (!isEdit) {
            const latest = sessionManager.sessions[id];
            if (!latest) { session = undefined; return; }
            session = structuredClone($state.snapshot(latest));
            durationMinutes = session.duration / 60;
            isEdit = true;
            return;
        }
        const result = await sessionManager.updateSession({ ...session, duration: Math.round(durationMinutes * 60) });
        if (result.success) {
            session = cloud.needsReload ? { ...session, duration: Math.round(durationMinutes * 60) }
                : structuredClone($state.snapshot(sessionManager.sessions[id]));
            isEdit = false;
        } else alert(result.message);
    }

    async function deleteSession() {
        if (!session) return;
        const result = await sessionManager.deleteSession(session.id, session.revision);
        if (result.success) goto("/sessions");
        else alert(result.message);
    }
</script>

{#if session}
<header>
    <div class="flex items-center gap-4">
        <BackBtn dest={"/sessions"} />
        <h1 class="min-w-0 flex-1 break-words text-2xl sm:text-3xl">{session.date}</h1>
        <div class="flex shrink-0 gap-3">
            <ConfirmDialog onconfirm={deleteSession}>
                {#snippet trigger()}
                    <Trash2 />
                {/snippet}
            </ConfirmDialog>
            <Button
                variant={"outline"}
                aria-label={isEdit ? "Save session" : "Edit session"}
                disabled={cloud.saving || cloud.loading || cloud.needsReload}
                onclick={toggleEdit}
            >
                {#if isEdit}
                    <Check />
                {:else}
                    <Pencil />
                {/if}
            </Button>
        </div>
    </div>
    <div class="grid min-w-0 gap-5">
        <Field label="Duration (mins)" id="edit-session-duration">
            <FieldIcon icon={Timer}><Input id="edit-session-duration" type="number" min="0" step="any" class="pl-10" readonly={!isEdit} bind:value={durationMinutes} /></FieldIcon>
        </Field>
        <Field label="Routine">
            <FieldIcon icon={ListChecks}><Combobox
                noun="routine"
                ariaLabel="Routine"
                triggerClass="h-auto min-h-9 pl-10 whitespace-normal text-left wrap-anywhere disabled:opacity-100"
                class="w-[var(--bits-popover-anchor-width)]"
                options={routineOptions}
                bind:value={session.routineId}
                disabled={!isEdit}
                onChange={() => {
                    if (session) session.routineName = routineOptions.find((option) => option.value === session?.routineId)?.label;
                }}
            /></FieldIcon>
        </Field>
    </div>
</header>

<section aria-labelledby="session-exercises-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="session-exercises-heading" class="text-xl">Exercises</h2>
        <div aria-live="polite"><WorkoutCardMeta exerciseCount={session.exercises.length} /></div>
    </div>
    <ExerciseManager bind:exercises={session.exercises} readonly={!isEdit} cardStyle="exercise" />
</section>
{:else}
    <header class="flex items-center gap-4 space-y-0"><BackBtn dest="/sessions" /><h1 class="min-w-0 text-2xl sm:text-3xl">Session not found</h1></header><p>This session may have been deleted or belongs to another account.</p>
{/if}
