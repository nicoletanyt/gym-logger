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

    const id = $derived(page.params.id ?? "");
    const storedSession = $derived(
        Object.entries(sessionManager.sessions).find(([key, value]) => key === id || value.id === id),
    );
    const session = $derived(storedSession?.[1]);

    let isEdit = $state(false);

    function updateSession() {
        sessionManager.updateData();
    }

    function deleteSession() {
        if (!storedSession) return;
        sessionManager.deleteSession(storedSession[0]);
        goto("/sessions");
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
                onclick={() => {
                    isEdit = !isEdit;
                    if (isEdit) {
                        session.duration /= 60;
                    } else {
                        session.duration *= 60;
                        updateSession();
                    }
                }}
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
        {#if isEdit}
            <p class="flex justify-between items-center gap-5">
                <span class="shrink-0"> Duration (mins): </span>
                <Input type="number" bind:value={session.duration} />
            </p>
        {:else}
            <p>Duration: {formatDuration(session.duration)}</p>
        {/if}
    </div>
</header>

<section>
    <ExerciseManager bind:exercises={session.exercises} />
</section>
{:else if !sessionManager.loaded}
    <p role="status">Loading session…</p>
{:else}
    <header>
        <BackBtn dest="/sessions" />
        <h1>Session not found</h1>
        <p class="text-muted-foreground">This session is not available in this browser.</p>
    </header>
{/if}
