<script lang="ts">
    import ExerciseCard from "$lib/components/ExerciseCard.svelte";
    import Button, {
        buttonVariants,
    } from "$lib/components/ui/button/button.svelte";
    import {
        exerciseManager,
        METRICS,
        type Exercise,
    } from "$lib/Exercise.svelte";
    import { Plus } from "@lucide/svelte";
    import { onMount } from "svelte";
    import { v4 as uuidv4 } from "uuid";
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import { cn } from "$lib/utils";
    import Label from "$lib/components/ui/label/label.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";

    let newExercise = $state<Exercise>(exerciseManager.createDefaultExercise());
    let showAdd = $state(false);
</script>

<header>
    <h1>Exercises</h1>
</header>

<!-- List of Exercises -->
<section>
    {#each exerciseManager.exercises as item}
        <ExerciseCard exercise={item} />
    {/each}
</section>

<Button
    class={cn(
        buttonVariants({ variant: "default", size: "icon-lg" }),
        "absolute bottom-5 right-0",
    )}
    onclick={() => {
        showAdd = true;
    }}
>
    <Plus />
</Button>

<!-- TODO: -->
<Sheet.Root open={showAdd}>
    <!-- Add Buttton -->
    <Sheet.Content side="bottom" class="min-h-150 p-4">
        <Sheet.Header>
            <Sheet.Title>Create New Exercise</Sheet.Title>
            <Sheet.Description>new exercises woohoo!</Sheet.Description>
        </Sheet.Header>
        <section class="px-4 my-0">
            <div class="flex justify-between gap-6">
                <Label class="shrink-0">Exercise Name</Label>
                <Input bind:value={newExercise.name} />
            </div>
            <div class="flex justify-between gap-6">
                <Label class="shrink-0">Exercise Type</Label>
                <Combobox
                    noun="routine"
                    options={Object.values(METRICS).map((m) => {
                        return {
                            value: m.name.toLowerCase(),
                            label: m.name,
                        };
                    })}
                    bind:value={newExercise.metricType}
                />
            </div>
            <div class="flex justify-between gap-6">
                <Label class="shrink-0">Image Link</Label>
                <Input bind:value={newExercise.imageLink} />
            </div>
        </section>

        <ActionButton
            text="Add Exercise"
            className="p-8"
            onclick={() => {
                exerciseManager.addExercise(newExercise);
                exerciseManager.updateData();
                showAdd = false;
            }}
        />
    </Sheet.Content>
</Sheet.Root>
