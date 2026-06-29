<script lang="ts">
    import { v4 as uuidv4 } from "uuid";
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

    let elapsed = $state(0); // in seconds

    let isAllDone = $derived(
        activeExercises.every(
            (item: ActiveExercise) => item.currentSet == item.exercise.sets,
        ),
    );

    $effect(() => {
        // TODO: DELETE. DUMMY DATA
        // sessionData.exercises = [
        //     {
        //         id: uuidv4(),
        //         name: "bicep curls",
        //         sets: 3,
        //         reps: 15,
        //     },
        //     {
        //         id: uuidv4(),
        //         name: "tricep curls",
        //         sets: 3,
        //         reps: 10,
        //     },
        // ];
    });

    $effect(() => {
        if (!isOngoing) return;
        const interval = setInterval(() => {
            elapsed++;
        }, 1000);
        return () => clearInterval(interval);
    });

    function startSession() {
        sessionData.startTime = new Date();
        isOngoing = true;
        // init active exercises
        for (let i = 0; i < sessionData.exercises.length; i++) {
            activeExercises.push({
                exercise: sessionData.exercises[i],
                currentSet: 0,
                durations: [],
                prevStart: new Date(),
            });
        }
    }
    function endSession() {
        isOngoing = false;
        goto("/");
    }

    function formatDuration(seconds: number) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        let mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (mins < 60) return `${mins}m ${secs.toString().padStart(2, "0")}s`;

        const hours = Math.floor(mins / 60);
        mins %= 60;
        return `${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }

    function getDuration(startTime: Date, endTime: Date) {
        // console.log("Start: ", startTime, " End: ", endTime);
        const diff = endTime.getTime() - startTime.getTime();
        return Math.floor(diff / 1000);
    }
</script>

<header class="space-y-5 mb-10">
    <BackBtn />
    <h1>New Session</h1>
</header>

<section>
    {#if isOngoing}
        <p>
            Date: <span class="font-bold">
                {sessionData.date}
            </span>
        </p>
    {:else}
        <div class="flex justify-between">
            <Label class="shrink-0">Date</Label>
            <Input
                disabled={isOngoing}
                type="date"
                class="w-1/2"
                bind:value={sessionData.date}
            />
        </div>
    {/if}
</section>

<hr />

{#if !isOngoing}
    <ExerciseManager bind:exercises={sessionData.exercises} />
{:else}
    <section class="space-y-8">
        {#each activeExercises as item}
            {@const id = `${item.exercise.name}|${item.currentSet}`}
            <div class="space-y-3">
                <div class="font-bold">{item.exercise.name}</div>
                <div class="space-y-2">
                    {#each Array.from( { length: Math.min(item.currentSet + 1, item.exercise.sets ?? 0) }, ) as _, i}
                        {@const checked = i < item.currentSet}
                        {@const worse = Math.max(...item.durations)}
                        {@const best = Math.min(...item.durations)}
                        {console.log(best, " ", worse)}
                        <div class="flex items-center justify-between">
                            <div class="space-x-3 flex items-center">
                                <Checkbox
                                    {id}
                                    {checked}
                                    disabled={checked}
                                    onCheckedChange={(done) => {
                                        if (done) {
                                            item.currentSet++;
                                            item.durations.push(
                                                getDuration(
                                                    item.prevStart,
                                                    new Date(),
                                                ),
                                            );
                                            item.prevStart = new Date();
                                        }
                                    }}
                                />
                                <Label
                                    for={id}
                                    class={`font-normal text-base ${checked ? "line-through" : ""}`}
                                    >Set {i + 1} - x{item.exercise.reps}
                                </Label>
                            </div>
                            <!-- Time Label -->
                            {#if checked}
                                <Label
                                    class={`${best == item.durations[i] ? "text-success" : worse == item.durations[i] ? "text-destructive" : "text-normal"}`}
                                >
                                    +{formatDuration(item.durations[i])}
                                </Label>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </section>
{/if}

<section class="space-y-5 fixed w-full left-0 bottom-0 px-10">
    {#if isOngoing}
        <p class="mx-auto">
            Elapsed:
            <span class="font-bold">
                {formatDuration(elapsed)}
            </span>
        </p>
    {:else}
        <Button onclick={startSession}>Start Session</Button>
    {/if}

    <ConfirmDialog
        onconfirm={endSession}
        buttonClass={!isOngoing ? "pointer-events-none opacity-50 " : ""}
        buttonVar={isOngoing
            ? isAllDone
                ? "success"
                : "destructive"
            : "default"}
        title="Confirm end session?"
        description={isAllDone
            ? "nice, all exercises are done :)"
            : "not all exercises are completed... :("}
    >
        {#snippet trigger()}
            End Session
        {/snippet}
    </ConfirmDialog>
</section>
