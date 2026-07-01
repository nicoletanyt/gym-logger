<script lang="ts">
    import BackBtn from "$lib/components/BackBtn.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";
    import type { ActiveExercise } from "$lib/types";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { goto } from "$app/navigation";
    import {
        DEFAULT_SESSION,
        sessionManager,
        type Session,
    } from "$lib/Session.svelte";
    import Combobox from "$lib/components/ui/combobox/combobox.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import { formatDuration } from "$lib/constants";

    // let sessionManager.activeSession = $state<Session>(DEFAULT_SESSION);
    let isOngoing = $state(false);
    let activeExercises = $state<ActiveExercise[]>([]);

    let elapsed = $state(0); // in seconds

    let isAllDone = $derived(
        activeExercises.every(
            (item: ActiveExercise) => item.currentSet == item.exercise.sets,
        ),
    );

    $effect(() => {
        if (!isOngoing) return;
        const interval = setInterval(() => {
            elapsed++;
        }, 1000);
        return () => clearInterval(interval);
    });

    function startSession() {
        sessionManager.activeSession.startTime = new Date();
        isOngoing = true;
        // init active exercises
        for (
            let i = 0;
            i < sessionManager.activeSession.exercises.length;
            i++
        ) {
            activeExercises.push({
                exercise: sessionManager.activeSession.exercises[i],
                currentSet: 0,
                durations: [],
                prevStart: new Date(),
            });
        }
    }
    function endSession() {
        isOngoing = false;
        sessionManager.activeSession.duration = elapsed;
        for (
            let i = 0;
            i < sessionManager.activeSession.exercises.length;
            i++
        ) {
            sessionManager.activeSession.exercises[i].avgDuration =
                activeExercises[i].durations.reduce(
                    (sum, current) => sum + current,
                    0,
                ) / activeExercises[i].durations.length;
        }

        goto("/sessions/summary");
    }

    function getDuration(startTime: Date, endTime: Date) {
        // console.log("Start: ", startTime, " End: ", endTime);
        const diff = endTime.getTime() - startTime.getTime();
        return Math.floor(diff / 1000);
    }

    $effect(() => {
        sessionManager.applyRoutine(sessionManager.activeSession);
    });
</script>

<header>
    {#if !isOngoing}
        <BackBtn />
    {/if}
    <h1>New Session</h1>
</header>

<section class="space-y-3">
    {#if isOngoing}
        <p>
            Date: <span class="font-bold">
                {sessionManager.activeSession.date}
            </span>
        </p>
    {:else}
        <div class="flex justify-between">
            <Label class="shrink-0">Date</Label>
            <Input
                disabled={isOngoing}
                type="date"
                class="w-1/2"
                bind:value={sessionManager.activeSession.date}
            />
        </div>
        <div class="flex justify-between">
            <Label class="shrink-0">Routine</Label>
            <Combobox
                noun="routine"
                options={routineManager.options}
                bind:value={sessionManager.activeSession.routineId}
            />
        </div>
    {/if}
</section>

<hr />

{#if !isOngoing}
    <section>
        <ExerciseManager
            bind:exercises={sessionManager.activeSession.exercises}
        />
    </section>
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

<section class="fixed w-full left-0 bottom-0 px-10">
    {#if isOngoing}
        <p class="mx-auto">
            Elapsed:
            <span class="font-bold">
                {formatDuration(elapsed)}
            </span>
        </p>

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
    {:else}
        <Button
            onclick={startSession}
            disabled={sessionManager.activeSession.exercises.length == 0}
            >Start Session</Button
        >
    {/if}
</section>
