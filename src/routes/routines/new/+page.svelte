<script lang="ts">
    import { Input } from "$lib/components/ui/input/index.js";
    import { goto } from "$app/navigation";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { routineManager, type Routine } from "$lib/Routine.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { cloud } from "$lib/cloud.svelte";
    import { Plus } from "@lucide/svelte";

    let newRoutine = $state<Routine>(routineManager.createDefault());
    let error = $state("");

    async function save(event: SubmitEvent) {
        event.preventDefault();
        error = "";
        const result = await routineManager.addRoutine(newRoutine);
        if (result.success) await goto("/routines");
        else error = result.message;
    }
</script>

<div class="mx-auto flex min-h-full w-full max-w-2xl flex-col">
<header class="mt-4 mb-8 flex items-center gap-4 space-y-0">
    <BackBtn dest={"/routines"} iconOnly />
    <h1 class="min-w-0 text-2xl sm:text-3xl">Create Routine</h1>
</header>

<form class="flex flex-1 flex-col gap-8" onsubmit={save}>
    <label class="grid gap-2 text-sm font-medium">
        Name
        <Input bind:value={newRoutine.name} />
    </label>

    <section class="my-0 space-y-4">
        <h2>Exercises</h2>
        {#if newRoutine.exercises.length === 0}
            <p class="text-sm text-muted-foreground">No exercises added yet.</p>
        {/if}
        <ExerciseManager bind:exercises={newRoutine.exercises} />
    </section>
    {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
    <div class="sticky bottom-0 z-10 mt-auto bg-background pt-4 pb-2">
        <Button type="submit" variant="secondary" class="h-auto w-full bg-green-300 px-6 py-4 text-zinc-950 hover:bg-green-400" disabled={cloud.saving || cloud.needsReload || cloud.loading}><Plus /> Add Routine</Button>
    </div>
</form>
</div>
