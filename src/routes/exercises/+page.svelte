<script lang="ts">
    import ExerciseCard from "$lib/components/ExerciseCard.svelte";
    import {
        exerciseManager,
        METRICS,
        type Exercise,
    } from "$lib/Exercise.svelte";
    import * as Sheet from "$lib/components/ui/sheet/index.js";
    import Input from "$lib/components/ui/input/input.svelte";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import ActionButton from "$lib/components/ActionButton.svelte";
    import Field from "$lib/components/Field.svelte";
    import AddBtn from "$lib/components/AddBtn.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { X } from "@lucide/svelte";

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
    {:else}
        <p>No Exercises Added</p>
    {/each}
</section>

<AddBtn
    onclick={() => {
        showAdd = true;
    }}
/>

<Sheet.Root bind:open={showAdd}>
    <!-- Add Buttton -->
    <Sheet.Content side="bottom" class="min-h-150 p-4" showCloseButton={false}>
        <Sheet.Header class="flex justify-between">
            <Sheet.Title>Create New Exercise</Sheet.Title>
            <Button
                variant={"ghost"}
                size="icon-sm"
                onclick={() => (showAdd = false)}
            >
                <X />
            </Button>
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
            <Field label="Note">
                <Input bind:value={newExercise.note} />
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
