<script lang="ts">
    import { goto } from "$app/navigation";
    import { ChevronLeft, Plus } from "@lucide/svelte";
    import { exerciseManager, METRICS, type Exercise } from "$lib/Exercise.svelte";
    import { completeExerciseCreation } from "$lib/exercise-creation";
    import ExerciseImagePicker from "$lib/components/ExerciseImagePicker.svelte";
    import ErrorAlert from "$lib/components/ErrorAlert.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import { cloud } from "$lib/cloud.svelte";
    import { untrack } from "svelte";

    let { name = "", token }: { name?: string; token?: string } = $props();
    let exercise = $state<Exercise>({ ...exerciseManager.createDefaultExercise(), name: untrack(() => name) });
    let imageFile = $state<File | null>(null);
    let error = $state("");

    function back() {
        if (token) history.back();
        else void goto("/exercises");
    }

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!exercise.name.trim()) {
            error = "Enter an exercise name.";
            return;
        }
        error = "";
        const result = await exerciseManager.addExercise(exercise, imageFile);
        if (!result.success) {
            error = result.message;
            return;
        }
        if (token) {
            completeExerciseCreation(token, exercise.id);
            history.back();
        } else {
            await goto("/exercises");
        }
    }
</script>

<div class="mx-auto flex min-h-full w-full max-w-2xl flex-col">
    <header class="mt-4 mb-8 flex items-center gap-4 space-y-0">
        <Button variant="outline" size="icon" aria-label="Back" onclick={back}><ChevronLeft /></Button>
        <h1 class="min-w-0 text-2xl sm:text-3xl">Create Exercise</h1>
    </header>

    <form class="flex flex-1 flex-col gap-6" onsubmit={save}>
        <div class="grid gap-5">
            <label class="grid gap-2 text-sm font-medium">
                Name
                <Input bind:value={exercise.name} placeholder="e.g. Bench press" />
            </label>
            <div class="grid gap-2 text-sm font-medium">
                <span>Exercise Type</span>
                <Combobox noun="type" ariaLabel="Exercise Type" class="w-[var(--bits-popover-anchor-width)]" options={Object.values(METRICS).map((m) => ({ value: m.name.toLowerCase(), label: m.name }))} bind:value={exercise.metricType} />
            </div>
            <label class="grid gap-2 text-sm font-medium">
                <span>Note <span class="font-normal text-muted-foreground">(optional)</span></span>
                <Input bind:value={exercise.note} />
            </label>
        </div>
        <ExerciseImagePicker bind:imageLink={exercise.imageLink} bind:file={imageFile} />
        {#if error}<ErrorAlert message={error} ondismiss={() => (error = "")} />{/if}
        <div class="sticky bottom-0 z-10 mt-auto bg-background pt-4 pb-2">
            <Button type="submit" variant="secondary" class="h-auto w-full bg-green-300 px-6 py-4 text-zinc-950 hover:bg-green-400" disabled={cloud.saving || cloud.needsReload || cloud.loading}><Plus /> Add Exercise</Button>
        </div>
    </form>
</div>
