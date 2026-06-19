<script lang="ts">
    import { ChevronLeft, Plus, Star } from "@lucide/svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Combobox } from "$lib/components/ui/combobox/";
    import type { Routine, Session } from "$lib/types";
    import { goto } from "$app/navigation";
    import { DEFAULT_SESSION } from "$lib/constants";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";

    let sessionData = $state<Session>(DEFAULT_SESSION);

    const routinesOption = $derived([
        { value: "custom", label: "Custom" },
        ...JSON.parse(localStorage.getItem("ROUTINES_STORED") ?? "[]").map(
            (r: Routine) => ({
                value: r.id,
                label: r.name,
            }),
        ),
    ]);
    const routinesData = $derived(
        JSON.parse(localStorage.getItem("ROUTINES_STORED") ?? "[]"),
    );

    function addSession() {
        const currentSessions = JSON.parse(
            localStorage.getItem("EXERCISES_STORED") ?? "{}",
        );
        currentSessions[sessionData.date] = sessionData;

        localStorage.setItem(
            "EXERCISES_STORED",
            JSON.stringify(currentSessions),
        );
        alert("Session Added!");
        goto("/");
    }

    $effect(() => {
        if (sessionData.templateId != "custom") {
            const template = routinesData.find(
                (r: Routine) => r.id == sessionData.templateId,
            );
            sessionData.exercises = template ? [...template.exercises] : [];
        } else {
            sessionData.exercises = [];
        }
    });
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
                        <Star
                            fill={num <= sessionData.effort
                                ? "primary"
                                : "none"}
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
                bind:value={sessionData.templateId}
            />
        </div>
    </section>

    <section class="space-y-5">
        <ExerciseManager bind:exercises={sessionData.exercises} />
    </section>
</form>

<section>
    <Button variant="secondary" class="bg-green-300" onclick={addSession}>
        <Plus />
        Add Session
    </Button>
</section>
