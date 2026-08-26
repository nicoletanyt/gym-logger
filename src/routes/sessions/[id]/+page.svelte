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

    const id = page.params.id ?? "";
    const session = $state(sessionManager.sessions[id]);

    let isEdit = $state(false);

    function updateSession() {
        sessionManager.updateData();
    }

    function deleteSession() {
        sessionManager.deleteSession(session.date);
        goto("/sessions");
    }
</script>

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

