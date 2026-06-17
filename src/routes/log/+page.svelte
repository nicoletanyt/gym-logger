<script lang="ts">
    import { ChevronLeft, Plus, Check, X, Star } from "@lucide/svelte";
    import * as Table from "$lib/components/ui/table/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Combobox } from "$lib/components/ui/combobox/";
    import type { Exercise, Session } from "$lib/types";
    import { goto } from "$app/navigation";

    const DEFAULT_SESSION: Session = {
        duration: 20,
        effort: 3,
        exercises: [],
        date: new Date().toISOString().split("T")[0],
    };
    let sessionData = $state<Session>(DEFAULT_SESSION);

    let exercisesData = $state<Exercise[]>([]);

    const DEFAULT_EXERCISE: Exercise = {
        name: "Example Exercise",
        sets: 0,
        reps: 0,
    };
    let newExerciseData = $state<Exercise>(DEFAULT_EXERCISE);

    let isInput = $state(false);

    function addExercise() {
        exercisesData.push(newExerciseData);
        newExerciseData = DEFAULT_EXERCISE;
    }

    function addSession() {
        sessionData.exercises = exercisesData;
        const currentSessions = JSON.parse(
            localStorage.getItem("EXERCISES_STORED") ?? "[]",
        );
        currentSessions.push(sessionData);

        localStorage.setItem(
            "EXERCISES_STORED",
            JSON.stringify(currentSessions),
        );
        alert("Session Added!");
        goto("/");
    }
</script>

<header class="space-y-5 mb-10">
    <Button variant="outline" href="/">
        <ChevronLeft />
        Back
    </Button>
    <h1>Log Session</h1>
</header>

<form class="space-y-3">
    <section class="space-y-3">
        <div class="flex justify-between">
            <Label class="shrink-0">Duration (in mins)</Label>
            <Input
                type="number"
                class="w-1/2"
                bind:value={sessionData.duration}
            />
        </div>
        <div class="flex justify-between">
            <Label class="shrink-0">Date</Label>
            <Input type="date" class="w-1/2" bind:value={sessionData.date} />
        </div>
        <div class="flex justify-between">
            <Label class="shrink-0">Level of effort</Label>
            <div class="flex w-1/2 justify-between">
                {#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onclick={() => {
                            sessionData.effort = num;
                        }}
                    >
                        {#if num <= sessionData.effort}
                            <Star fill={"primary"} />
                        {:else}
                            <Star />
                        {/if}
                    </Button>
                {/each}
            </div>
        </div>
        <div class="flex justify-between">
            <Label class="shrink-0">Routine</Label>
            <Combobox
                noun="routine"
                options={[
                    {
                        value: "1",
                        label: "2",
                    },
                ]}
            />
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
                {#each exercisesData as exercise}
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
</form>

<section>
    <Button variant="secondary" class="bg-green-300" onclick={addSession}>
        <Plus />
        Add Session
    </Button>
</section>
