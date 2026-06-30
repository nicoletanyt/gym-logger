<script lang="ts">
    import { Plus, Star } from "@lucide/svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Combobox } from "$lib/components/ui/combobox/";
    import { goto } from "$app/navigation";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import {
        DEFAULT_SESSION,
        type Session,
        sessionManager,
    } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";

    let newSession = $state<Session>(DEFAULT_SESSION);

    const routinesOption = $derived([
        { value: "custom", label: "Custom" },
        ...routineManager.routines.map((r) => ({
            value: r.id,
            label: r.name,
        })),
    ]);

    $effect(() => {
        if (newSession.routineId != "custom") {
            const routine = routineManager.getById(newSession.routineId);
            newSession.exercises = [...routine.exercises];
        } else {
            newSession.exercises = [];
        }
    });
</script>

<header class="space-y-5 mb-10">
    <BackBtn />
    <h1>Log Session</h1>
</header>

<form class="space-y-3">
    <section class="space-y-3">
        <div class="flex justify-between">
            <Label class="shrink-0">Duration (in mins)</Label>
            <Input
                type="number"
                class="w-1/2"
                bind:value={newSession.duration}
            />
        </div>
        <div class="flex justify-between">
            <Label class="shrink-0">Date</Label>
            <Input type="date" class="w-1/2" bind:value={newSession.date} />
        </div>
        <div class="flex justify-between">
            <Label class="shrink-0">Level of effort</Label>
            <div class="flex w-1/2 justify-between">
                {#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onclick={() => {
                            newSession.effort = num;
                        }}
                    >
                        <Star
                            fill={num <= newSession.effort ? "primary" : "none"}
                        />
                    </Button>
                {/each}
            </div>
        </div>
        <div class="flex justify-between">
            <Label class="shrink-0">Routine</Label>
            <Combobox
                noun="routine"
                options={routinesOption}
                bind:value={newSession.routineId}
            />
        </div>
    </section>

    <hr />

    <ExerciseManager bind:exercises={newSession.exercises} />
</form>

<section class="space-y-5 fixed w-full left-0 bottom-0 px-10">
    <Button
        variant="secondary"
        class="bg-green-300"
        onclick={() => {
            const result = sessionManager.addSession(newSession);

            alert(result.success ? "Session Added!" : result.message);
            if (result.success) goto("/");
        }}
    >
        <Plus />
        Add Session
    </Button>
</section>
