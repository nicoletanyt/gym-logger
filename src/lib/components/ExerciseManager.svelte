<script lang="ts">
    import { Plus, Check, X } from "@lucide/svelte";
    import * as Table from "$lib/components/ui/table/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import type { Exercise } from "$lib/types";
    import { DEFAULT_EXERCISE } from "$lib/constants";

    let { exercises = $bindable() } = $props();

    let newExerciseData = $state<Exercise>(DEFAULT_EXERCISE);

    let isInput = $state(false);

    function addExercise() {
        exercises.push({ ...newExerciseData });
        newExerciseData = DEFAULT_EXERCISE;
    }
</script>

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
            {#each exercises as exer}
                <Table.Row>
                    <Table.Cell>{exer.name}</Table.Cell>
                    <Table.Cell class="text-center">{exer.sets}</Table.Cell>
                    <Table.Cell class="text-center">{exer.reps}</Table.Cell>
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
                    addExercise();
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
