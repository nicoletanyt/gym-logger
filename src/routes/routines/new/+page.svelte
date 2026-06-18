<script lang="ts">
    import { ChevronLeft, Plus, Check, X, Star } from "@lucide/svelte";
    import * as Table from "$lib/components/ui/table/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Combobox } from "$lib/components/ui/combobox/";
    import type { Routine, Exercise, Session } from "$lib/types";
    import { goto } from "$app/navigation";
    import {
        DEFAULT_EXERCISE,
        DEFAULT_ROUTINE,
        DEFAULT_SESSION,
    } from "$lib/constants";

    let routineData = $state<Routine>(DEFAULT_ROUTINE);

    let isInput = $state(false);
    let newExerciseData = $state<Exercise>(DEFAULT_EXERCISE);
</script>

<header class="space-y-5 mb-10">
    <Button variant="outline" href="/">
        <ChevronLeft />
        Back
    </Button>
    <h1>Create Routine</h1>
</header>

<form class="space-y-3">
    <section class="space-y-3">
        <div class="flex justify-between">
            <Label class="shrink-0">Name</Label>
            <Input class="w-1/2" bind:value={routineData.name} />
        </div>
    </section>

    <section class="space-y-5">
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head>Exercise</Table.Head>
                    <Table.Head class="w-1/4 text-center">Sets</Table.Head>
                    <Table.Head class="w-1/4 text-center">Reps</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#each routineData.exercises as exercise}
                    <Table.Row>
                        <Table.Cell>{exercise.name}</Table.Cell>
                        <Table.Cell class="text-center"
                            >{exercise.sets}</Table.Cell
                        >
                        <Table.Cell class="text-center"
                            >{exercise.reps}</Table.Cell
                        >
                    </Table.Row>
                {/each}
                {#if isInput}
                    <Table.Row>
                        <Table.Cell>
                            <Input bind:value={newExerciseData.name} />
                        </Table.Cell>
                        <Table.Cell class="text-center">
                            <Input
                                type="number"
                                bind:value={newExerciseData.sets}
                            />
                        </Table.Cell>
                        <Table.Cell class="text-center">
                            <Input
                                type="number"
                                bind:value={newExerciseData.reps}
                            />
                        </Table.Cell>
                    </Table.Row>
                {/if}
            </Table.Body>
        </Table.Root>

        <div class="flex justify-end gap-2">
            {#if isInput}
                <Button
                    variant="destructive"
                    onclick={() => {
                        isInput = false;
                    }}
                >
                    <X />
                    Cancel
                </Button>
                <Button
                    variant="secondary"
                    class="bg-green-300"
                    onclick={() => {
                        // addExercise();
                        isInput = false;
                    }}
                >
                    <Check />
                    Done
                </Button>
            {:else}
                <Button
                    variant="secondary"
                    class="ml-auto"
                    onclick={() => {
                        isInput = true;
                    }}
                >
                    <Plus />
                    Add Exercise
                </Button>
            {/if}
        </div>
    </section>
</form>

<section>
    <Button variant="secondary" class="bg-green-300" onclick={() => {}}>
        <Plus />
        Add Routine
    </Button>
</section>
