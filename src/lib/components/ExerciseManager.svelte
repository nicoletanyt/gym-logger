<script lang="ts">
    import {
        Plus,
        Check,
        X,
        Trash2,
        Pencil,
        ChevronRight,
    } from "@lucide/svelte";
    import { v4 as uuidv4 } from "uuid";
    import * as Table from "$lib/components/ui/table/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { RowType, type Exercise, type Group } from "$lib/types";
    import { DEFAULT_EXERCISE } from "$lib/constants";
    import Checkbox from "./ui/checkbox/checkbox.svelte";

    let { exercises = $bindable<Exercise[]>() } = $props();

    let groups = $state<Group[]>([]);
    let newExerciseData = $state<Exercise>(DEFAULT_EXERCISE);

    let isInput = $state(false);
    let isEdit = $state(false);
    let selectedRows = $state<string[]>([]);
    let groupName = $state("");

    let rows = $derived([
        ...groups.flatMap((group) => [
            { type: RowType.GroupHeading, data: group },
            ...exercises
                .filter((e: Exercise) => e.groupId == group.id)
                .map((e: Exercise) => ({
                    type: RowType.ExerciseItem,
                    data: e,
                })),
        ]),
        ...exercises
            .filter((e: Exercise) => !e.groupId)
            .map((e: Exercise) => ({
                type: RowType.ExerciseItem,
                data: e,
            })),
    ]);

    function addExercise() {
        newExerciseData.id = uuidv4();
        exercises.push({ ...newExerciseData });
        newExerciseData = DEFAULT_EXERCISE;
    }

    function selectRow(index: string) {
        if (selectedRows.includes(index)) {
            selectedRows.splice(selectedRows.indexOf(index), 1);
        } else selectedRows.push(index);
    }

    function getSelectedExericses() {
        let ex: String[] = [];
        selectedRows.forEach((id) => {
            const e = exercises.find((e: Exercise) => e.id == id);
            ex.push(e.name);
        });
        return ex.join(", ");
    }

    function createGroup() {
        const id = uuidv4();
        const newGroup: Group = {
            id,
            name: groupName,
        };
        selectedRows.forEach((index) => {
            const e = exercises.find((e: Exercise) => e.id == index);
            e.groupId = id;
        });
        selectedRows = [];
        groups.push(newGroup);
    }

    $effect(() => {
        if (!isEdit) selectedRows = [];
    });
</script>

<section class="space-y-5">
    <Table.Root>
        <Table.Header>
            <Table.Row>
                {#if isEdit}
                    <Table.Head class="w-7"></Table.Head>
                {/if}
                <Table.Head>Exercise</Table.Head>
                <Table.Head class="w-1/4 text-center">Sets</Table.Head>
                <Table.Head class="w-1/4 text-center">Reps</Table.Head>
            </Table.Row>
        </Table.Header>
        <Table.Body>
            {#each rows as { type, data: item }}
                {#if type == RowType.GroupHeading}
                    <Table.Row>
                        {#if isEdit}
                            <Table.Cell class="w-7"></Table.Cell>
                        {/if}
                        <Table.Cell class="font-bold">{item.name}</Table.Cell>
                        <Table.Cell class="text-center"></Table.Cell>
                        <Table.Cell class="text-center"></Table.Cell>
                    </Table.Row>
                {:else}
                    <Table.Row
                        onclick={() => selectRow(item.id)}
                        class={item.groupId ? "bg-muted/50" : ""}
                    >
                        {#if isEdit}
                            <Table.Cell class="w-7">
                                <Checkbox
                                    checked={selectedRows.includes(item.id)}
                                />
                            </Table.Cell>
                        {/if}
                        <Table.Cell class="">{item.name}</Table.Cell>
                        <Table.Cell class="text-center">{item.sets}</Table.Cell>
                        <Table.Cell class="text-center">{item.reps}</Table.Cell>
                    </Table.Row>
                {/if}
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
        {#if isInput || isEdit}
            {#if isEdit && selectedRows.length == 1}
                <div class="mr-auto gap-2 flex items-center">
                    <Button variant="destructive" size="icon-sm"
                        ><Trash2 /></Button
                    >
                    <Button variant="outline" size="sm">Edit</Button>
                </div>
            {:else if isEdit && selectedRows.length > 1}
                <div class="mr-auto gap-2 flex items-center">
                    <Button variant="destructive" size="icon-sm"
                        ><Trash2 /></Button
                    >
                    <Dialog.Root>
                        <Dialog.Trigger
                            class={buttonVariants({
                                variant: "outline",
                                size: "sm",
                            })}>Group</Dialog.Trigger
                        >
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>Enter Group Name</Dialog.Title>
                                <Dialog.Description
                                    >Selected Exercises:
                                    <br />
                                    {getSelectedExericses()}
                                </Dialog.Description>
                            </Dialog.Header>
                            <Input bind:value={groupName} />
                            <Dialog.Footer class="">
                                <Dialog.Close
                                    class={buttonVariants({
                                        variant: "default",
                                    })}
                                    onclick={createGroup}>Add</Dialog.Close
                                >
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Root>
                </div>
            {/if}
            <Button
                variant="destructive"
                size="icon"
                onclick={() => {
                    isInput = false;
                    isEdit = false;
                }}
            >
                <X />
            </Button>
            <Button
                variant="secondary"
                class="bg-green-300"
                size="icon"
                onclick={() => {
                    if (isInput) {
                        addExercise();
                        isInput = false;
                    } else {
                        isEdit = false;
                    }
                }}
            >
                <Check />
            </Button>
        {:else}
            <Button
                variant="outline"
                class="mr-auto"
                onclick={() => {
                    isEdit = true;
                }}
            >
                <Pencil />
                Edit Exercises
            </Button>
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
