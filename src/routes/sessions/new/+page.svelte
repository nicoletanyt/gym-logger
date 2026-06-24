<script lang="ts">
    import BackBtn from "$lib/components/BackBtn.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import { DEFAULT_SESSION } from "$lib/constants";
    import type { Session, ActiveExercise } from "$lib/types";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { goto } from "$app/navigation";

    let sessionData = $state<Session>(DEFAULT_SESSION);
    let isOngoing = $state(false);
    let activeExercises = $state<ActiveExercise[]>([]);

    let isAllDone = $derived(
        activeExercises.every(
            (item: ActiveExercise) => item.currentSet == item.exercise.sets,
        ),
    );

    $effect(() => {
        // TODO: DELETE. DUMMY DATA
        sessionData.exercises = [
            {
                name: "bicep curls",
                sets: 3,
                reps: 15,
            },
            {
                name: "tricep curls",
                sets: 3,
                reps: 10,
            },
        ];
    });

    function startSession() {
        sessionData.startTime = new Date();
        isOngoing = true;
        // init active exercises
        for (let i = 0; i < sessionData.exercises.length; i++) {
            activeExercises.push({
                exercise: sessionData.exercises[i],
                currentSet: 0,
                startTimes: [new Date()],
                endTimes: [],
            });
        }
    }
    function endSession() {
        isOngoing = false;
        goto("/");
    }

    function getDuration(startTime: Date, endTime: Date) {
        // console.log("Start: ", startTime, " End: ", endTime);
        const diff = endTime.getTime() - startTime.getTime();
        const mins = diff / (1000 * 60);
        return mins.toFixed(2);
    }
</script>

<header class="space-y-5 mb-10">
    <BackBtn />
    <h1>New Session</h1>
</header>

<section class="">
    <div class="flex justify-between">
        <Label class="shrink-0">Date</Label>
        <Input
            disabled={isOngoing}
            type="date"
            class="w-1/2"
            bind:value={sessionData.date}
        />
    </div>
</section>

<hr />

{#if !isOngoing}
    <ExerciseManager bind:exercises={sessionData.exercises} />
{:else}
    <section class="space-y-3">
        {#each activeExercises as item}
            {@const id = `${item.exercise.name}|${item.currentSet}`}
            {#each Array.from({ length: item.exercise.sets }) as _, setCount}
                {#if setCount <= item.currentSet}
                    <div class="flex gap-3 items-center">
                        <Checkbox
                            {id}
                            checked={setCount < item.currentSet}
                            disabled={setCount < item.currentSet}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    item.currentSet++;
                                    item.endTimes.push(new Date());
                                    item.startTimes.push(new Date());
                                }
                            }}
                        />
                        <div class="flex justify-between flex-1">
                            <Label
                                for={id}
                                class={`font-normal text-base ${setCount < item.currentSet ? "line-through" : ""}`}
                                >{item.exercise.name} x{item.exercise.reps}
                            </Label>
                            {#if item.endTimes.length > setCount}
                                <Label>
                                    + {getDuration(
                                        setCount == 0
                                            ? item.startTimes[0]
                                            : item.endTimes[setCount - 1],
                                        item.endTimes[setCount],
                                    )} mins
                                </Label>
                            {/if}
                        </div>
                    </div>
                {/if}
            {/each}
        {/each}
    </section>
{/if}

<section class="space-y-5 fixed w-full left-0 bottom-0 px-10">
    {#if !isOngoing}
        <Button onclick={startSession}>Start Session</Button>
    {/if}

    <ConfirmDialog
        onconfirm={endSession}
        buttonClass={!isOngoing ? "pointer-events-none opacity-50 " : ""}
        buttonVar={"default"}
        title="Confirm end session?"
        description={isAllDone
            ? "nice, all exercises are done btw :)"
            : "Not all exercises are completed... :("}
    >
        {#snippet trigger()}
            End Session
        {/snippet}
    </ConfirmDialog>
</section>
