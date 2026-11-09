<script lang="ts">
    import { Check, Pencil, Trash2 } from "@lucide/svelte";
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import { formatDuration } from "$lib/constants";
    import { goto } from "$app/navigation";
    import { untrack } from "svelte";
    import type { Session } from "$lib/Session.svelte";
    import { cloud } from "$lib/cloud.svelte";

    const id = $derived(page.params.id ?? "");
    let session = $state<Session | undefined>();
    let isEdit = $state(false);
    let durationMinutes = $state(0);
    $effect(() => {
        const routeId = id;
        untrack(() => {
            const original = sessionManager.sessions[routeId];
            session = original ? structuredClone($state.snapshot(original)) : undefined;
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
    <div class="flex justify-between">
        <BackBtn dest={"/sessions"} />
        <div class="space-x-3">
            <ConfirmDialog onconfirm={deleteSession}>
                {#snippet trigger()}
                    <Trash2 />
                {/snippet}
            </ConfirmDialog>
            <Button
                variant={"outline"}
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
    <div class="space-y-3">
        <h1>{session.date}</h1>
        {#if session.routineName}<p class="text-muted-foreground">{session.routineName}</p>{/if}
        {#if isEdit}
            <p class="flex justify-between items-center gap-5">
                <span class="shrink-0"> Duration (mins): </span>
                <Input type="number" min="0" step="0.1" bind:value={durationMinutes} />
            </p>
        {:else}
            <p>Duration: {formatDuration(session.duration)}</p>
        {/if}
    </div>
</header>

<section>
    <ExerciseManager bind:exercises={session.exercises} readonly={!isEdit} />
</section>
{:else}
    <BackBtn dest="/sessions" /><h1>Session not found</h1><p>This session may have been deleted or belongs to another account.</p>
{/if}
