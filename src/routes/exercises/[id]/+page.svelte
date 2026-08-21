<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import MetricTypeTag from "$lib/components/MetricTypeTag.svelte";
    import CardStat from "$lib/components/CardStat.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import AreaChart from "$lib/components/charts/AreaChart.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import { Check, Pencil, Trash2 } from "@lucide/svelte";
    import { formatDuration } from "$lib/constants";
    import {
        exerciseManager,
        METRICS,
        type Cardio,
        type Duration,
        type Reps,
        type Weight,
    } from "$lib/Exercise.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";

    const id = $derived(page.params.id ?? "");
    const exercise = $derived(exerciseManager.getById(id));

    let isEdit = $state(false);
    let draftName = $state("");

    function toggleEdit() {
        if (isEdit) {
            exerciseManager.updateExercise({ ...exercise, name: draftName });
        } else {
            draftName = exercise.name;
        }
        isEdit = !isEdit;
    }

    function deleteExercise() {
        exerciseManager.removeExercises([id]);
        sessionManager.removeExerciseEntries([id]);
        routineManager.removeExerciseEntries([id]);
        goto("/exercises");
    }

    const sessionEntries = $derived(
        Object.values(sessionManager.sessions).flatMap((s) =>
            s.exercises
                .filter((e) => e.exerciseId == id)
                .map((e) => ({ date: s.date, metric: e.metric })),
        ),
    );

    type RepsStats = {
        maxReps: number;
        currentReps: number;
        areaData: { date: string; count: number }[];
    };

    const repsStats = $derived.by((): RepsStats | null => {
        if (exercise.metricType != "reps") return null;
        const list = sessionEntries
            .filter((e) => e.metric.type == "reps")
            .map((e) => ({ date: e.date, metric: e.metric as Reps }));
        if (list.length == 0) return null;
        const byDate = new Map<string, number>();
        let max = 0;
        for (const { date, metric } of list) {
            const count = metric.reps * metric.sets;
            max = Math.max(max, metric.reps);
            byDate.set(date, (byDate.get(date) ?? 0) + count);
        }
        const latest = [...list].sort((a, b) =>
            b.date.localeCompare(a.date),
        )[0];
        const currentReps = latest.metric.reps;
        const areaData = [...byDate.entries()]
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return { maxReps: max, currentReps, areaData };
    });

    type DurationStats = {
        totalSeconds: number;
        longestSet: number;
        areaData: { date: string; seconds: number }[];
    };

    const durationStats = $derived.by((): DurationStats | null => {
        if (exercise.metricType != "duration") return null;
        const list = sessionEntries
            .filter((e) => e.metric.type == "duration")
            .map((e) => ({ date: e.date, metric: e.metric as Duration }));
        const byDate = new Map<string, number>();
        let total = 0;
        let longest = 0;
        for (const { date, metric } of list) {
            const seconds = metric.duration * 60 * metric.sets;
            total += seconds;
            longest = Math.max(longest, metric.duration * 60);
            byDate.set(date, (byDate.get(date) ?? 0) + seconds);
        }
        const areaData = [...byDate.entries()]
            .map(([date, seconds]) => ({ date, seconds }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return { totalSeconds: total, longestSet: longest, areaData };
    });

    type CardioStats = {
        fastestSpeed: number;
        longest: { distance: number; date: string };
        areaData: { date: string; km: number }[];
    };

    const cardioStats = $derived.by((): CardioStats | null => {
        if (exercise.metricType != "cardio") return null;
        const list = sessionEntries
            .filter((e) => e.metric.type == "cardio")
            .map((e) => ({ date: e.date, metric: e.metric as Cardio }));
        const byDate = new Map<string, number>();
        let fastest = 0;
        let longest = { distance: 0, date: "" };
        for (const { date, metric } of list) {
            const distance = metric.distance;
            const speed =
                metric.duration > 0 ? distance / (metric.duration / 60) : 0;
            fastest = Math.max(fastest, speed);
            if (distance > longest.distance) longest = { distance, date };
            byDate.set(date, (byDate.get(date) ?? 0) + distance);
        }
        const perDate = [...byDate.entries()].sort((a, b) =>
            a[0].localeCompare(b[0]),
        );
        const areaData: { date: string; km: number }[] = [];
        let running = 0;
        for (const [date, km] of perDate) {
            running += km;
            areaData.push({ date, km: Math.round(running * 1000) / 1000 });
        }
        return { fastestSpeed: fastest, longest, areaData };
    });

    type WeightStats = {
        top: { weight: number; reps: number };
        current: { weight: number; reps: number };
        areaData: { date: string; weight: number }[];
    };

    const weightStats = $derived.by((): WeightStats | null => {
        if (exercise.metricType != "weight") return null;
        const list = sessionEntries
            .filter((e) => e.metric.type == "weight")
            .map((e) => ({ date: e.date, metric: e.metric as Weight }));
        if (list.length == 0) return null;

        const sorted = [...list].sort(
            (a, b) =>
                b.metric.weight - a.metric.weight ||
                b.metric.reps - a.metric.reps,
        );
        const top = {
            weight: sorted[0].metric.weight,
            reps: sorted[0].metric.reps,
        };
        const latest = [...list].sort((a, b) =>
            b.date.localeCompare(a.date),
        )[0];
        const current = {
            weight: latest.metric.weight,
            reps: latest.metric.reps,
        };

        const byDate = new Map<string, number>();
        for (const { date, metric } of list) {
            byDate.set(date, Math.max(byDate.get(date) ?? 0, metric.weight));
        }
        const areaData = [...byDate.entries()]
            .map(([date, weight]) => ({ date, weight }))
            .sort((a, b) => a.date.localeCompare(b.date));
        return { top, current, areaData };
    });

    function formatKm(km: number): string {
        return `${Math.round(km * 100) / 100} km`;
    }
</script>

<header>
    <div class="flex justify-between">
        <BackBtn dest="/exercises" />
        <div class="space-x-3">
            <ConfirmDialog
                title="Delete Exercise?"
                description={`This will permanently delete "${exercise.name}" and all related data, including every entry of it in your sessions and routines.`}
                onconfirm={deleteExercise}
                buttonVar="destructive"
            >
                {#snippet trigger()}
                    <Trash2 />
                {/snippet}
            </ConfirmDialog>
            <Button
                variant={"outline"}
                onclick={() => {
                    toggleEdit();
                }}
            >
                {#if isEdit}
                    <Check />
                {:else}
                    <Pencil />
                {/if}
            </Button>
        </div>
    </div>
    {#if isEdit}
        <Input bind:value={draftName} class="text-3xl py-5 px-2 font-bold" />
    {:else}
        <h1>{exercise.name}</h1>
    {/if}
    <MetricTypeTag metric={METRICS[exercise.metricType]} />
</header>

{#if sessionEntries.length == 0}
    <p class="text-muted-foreground">No sessions logged for this exercise yet.</p>
{:else if exercise.metricType == "weight" && weightStats}
    <section class="grid grid-cols-2 gap-3">
        <CardStat
            title="Top Weight & Reps"
            content={`${weightStats.top.weight} kg x${weightStats.top.reps}`}
        />
        <CardStat
            title="Current Weight & Reps"
            content={`${weightStats.current.weight} kg x${weightStats.current.reps}`}
        />
    </section>

    <section>
        <AreaChart
            title="Weight Progression"
            description="Weight used per session"
            chartData={weightStats.areaData}
            label="Weight"
            key="weight"
            x="date"
            y="weight"
            format={(v) => `${v} kg`}
        />
    </section>
{:else if exercise.metricType == "reps" && repsStats}
    <section class="grid grid-cols-2 gap-3">
        <CardStat
            title="Max Reps (single set)"
            content={`${repsStats.maxReps} reps`}
        />
        <CardStat
            title="Current Reps"
            content={`${repsStats.currentReps} reps`}
        />
    </section>

    <section>
        <AreaChart
            title="Total Reps Completed"
            description="Reps completed per session"
            chartData={repsStats.areaData}
            label="Reps"
            key="count"
            x="date"
            y="count"
            format={(v) => `${v} reps`}
        />
    </section>
{:else if exercise.metricType == "duration" && durationStats}
    <section class="grid grid-cols-2 gap-3">
        <CardStat
            title="Total Lifetime Time"
            content={formatDuration(durationStats.totalSeconds)}
        />
        <CardStat
            title="Longest Time Per Set"
            content={formatDuration(durationStats.longestSet)}
        />
    </section>

    <section>
        <AreaChart
            title="Time Held Per Workout"
            description="Total time held per session"
            chartData={durationStats.areaData}
            label="Seconds"
            key="seconds"
            x="date"
            y="seconds"
            format={formatDuration}
        />
    </section>
{:else if exercise.metricType == "cardio" && cardioStats}
    <section class="grid grid-cols-2 gap-3">
        <CardStat
            title="Fastest Speed"
            content={`${Math.round(cardioStats.fastestSpeed * 10) / 10} km/h`}
        />
        <CardStat
            title="Longest Session"
            content={formatKm(cardioStats.longest.distance)}
        />
    </section>

    <section>
        <AreaChart
            title="Total Distance Covered"
            description="Cumulative distance over time"
            chartData={cardioStats.areaData}
            label="Distance"
            key="km"
            x="date"
            y="km"
            format={formatKm}
        />
    </section>
{/if}