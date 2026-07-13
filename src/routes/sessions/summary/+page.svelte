<script lang="ts">
    import { goto } from "$app/navigation";
    import BarChart from "$lib/components/charts/BarChart.svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import Button from "$lib/components/ui/button/button.svelte";
    import Label from "$lib/components/ui/label/label.svelte";
    import { formatDuration, GIFS } from "$lib/constants";
    import { sessionManager } from "$lib/Session.svelte";
    import { Calendar, Plus, Star, Timer } from "@lucide/svelte";
    import CardStat from "$lib/components/CardStat.svelte";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";

    const gifSource =
        GIFS["happy"][Math.floor(Math.random() * GIFS["happy"].length)];

    function addSession() {
        // TODO: sessionManager.activeSession.effort
        const result = sessionManager.addSession(sessionManager.activeSession);

        alert(result.success ? "Session Added!" : result.message);
        if (result.success) goto("/");
    }

    const chartData = $derived([
        ...sessionManager.activeSession.exercises.map((e) => ({
            exercise: e.name,
            avg: e.avgDuration,
        })),
    ]);
</script>

<header class="grid">
    <h1>Session Complete!</h1>
    <div class="overflow-hidden rounded-xl mx-auto">
        <img src={gifSource} alt="Happy GIF" class="h-50 w-auto object-cover" />
    </div>
</header>

<section>
    <h2>Overview</h2>

    <div class="grid grid-cols-2 gap-3">
        <CardStat size="sm" content={sessionManager.activeSession.date}>
            {#snippet icon()}
                <Calendar />
            {/snippet}
        </CardStat>
        <CardStat
            size="sm"
            content={formatDuration(sessionManager.activeSession.duration)}
        >
            {#snippet icon()}
                <Timer />
            {/snippet}
        </CardStat>
        <CardStat size="sm" content={sessionManager.getSetCount() + " Sets"} />
        <CardStat
            size="sm"
            content={sessionManager.getExerciseCount() + " Exercises"}
        />
    </div>
</section>

<section>
    <h2>Performance</h2>
    <BarChart
        title={"Average time between sets"}
        {chartData}
        label={"Average Duration"}
        key={"avg"}
        y={"exercise"}
    />
</section>

<section class="mt-0">
    <h2>Exercises</h2>
    <ExerciseManager
        bind:exercises={sessionManager.activeSession.exercises}
        canEdit={false}
    />
</section>

<section>
    <div class="space-y-3 mx-auto">
        <Label class="text-base">Rate your level of effort</Label>
        <div class="flex justify-between items-center">
            {#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
                <Button
                    variant="outline"
                    size="icon-sm"
                    onclick={() => {
                        sessionManager.activeSession.effort = num;
                    }}
                >
                    <Star
                        fill={num <= sessionManager.activeSession.effort
                            ? "primary"
                            : "none"}
                    />
                </Button>
            {/each}
        </div>
    </div>
</section>

<section>
    <Button
        variant="secondary"
        class="bg-green-300"
        onclick={() => {
            const result = sessionManager.addActiveSession();

            alert(result.success ? "Session Added!" : result.message);
            if (result.success) goto("/");
        }}
    >
        Save Session
    </Button>
</section>
