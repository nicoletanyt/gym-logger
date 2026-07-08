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
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import { cn } from "$lib/utils";
    import Input from "$lib/components/ui/input/input.svelte";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import Field from "$lib/components/Field.svelte";

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
        </Sheet.Header>
        <section class="px-4 my-0">
            <Field label="Name">
                <Input bind:value={newExercise.name} />
            </Field>
            <Field label="Exercise Type">
                <Combobox
                    noun="type"
                    options={Object.values(METRICS).map((m) => {
                        return {
                            value: m.name.toLowerCase(),
                            label: m.name,
                        };
                    })}
                    bind:value={newExercise.metricType}
                />
            </Field>

            <Field label="Image Link">
                <Input bind:value={newExercise.imageLink} />
            </Field>
        </section>

        <ActionButton
            text="Add Exercise"
            onOverlay={true}
            onclick={() => {
                exerciseManager.addExercise(newExercise);
                exerciseManager.updateData();
                showAdd = false;
            }}
        />
    </Sheet.Content>
</Sheet.Root>
