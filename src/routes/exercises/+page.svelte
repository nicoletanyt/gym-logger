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

    let newExercise = $state<Exercise>(exerciseManager.createDefaultExercise());

    onMount(() => {
        exerciseManager.exercises = [
            {
                id: uuidv4(),
                name: "Bicep Curls",
                metricType: "weight",
            },
            {
                id: uuidv4(),
                name: "Crunches",
                metricType: "reps",
            },
        ];
        exerciseManager.updateData();
    });
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

<!-- TODO: -->
<Sheet.Root>
    <!-- Add Buttton -->
    <Sheet.Trigger
        class={cn(
            buttonVariants({ variant: "default", size: "icon-lg" }),
            "absolute bottom-5 right-0",
        )}
    >
        <Plus />
    </Sheet.Trigger>
    <Sheet.Content side="bottom" class="min-h-[600px]">
        <Sheet.Header>
            <Sheet.Title>Create New Exercise</Sheet.Title>
            <Sheet.Description>new exercises woohoo!</Sheet.Description>
        </Sheet.Header>
        <div class="p-4">
            <div class="flex justify-between gap-6">
                <Label class="shrink-0">Exercise Name</Label>
                <Input />
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
                <Input />
            </div>
        </div>
    </Sheet.Content>
</Sheet.Root>
