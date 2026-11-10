<script lang="ts">
    import {
        CalendarCheck,
        CalendarDays,
        Flame,
        PencilLine,
        Play,
        Timer,
        User,
    } from "@lucide/svelte";
    import { getLocalTimeZone, today } from "@internationalized/date";
    import { Calendar } from "$lib/components/ui/calendar/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { goto } from "$app/navigation";
    import { sessionManager } from "$lib/Session.svelte";
    import { formatDuration } from "$lib/constants";

    let dateValue = $state(today(getLocalTimeZone()));
    const streak = $derived(sessionManager.calculateStreak());
    const sessionCount = $derived(sessionManager.getCount());
    const averageDuration = $derived(
        sessionCount
            ? Math.round(sessionManager.getTotalDuration() / sessionCount)
            : 0,
    );
    const stats = $derived([
        {
            label: "Streak",
            value: `${streak} ${streak === 1 ? "day" : "days"}`,
            icon: Flame,
            colour: "bg-pink-200 dark:bg-[#513240]",
        },
        {
            label: "Workouts this week",
            value: sessionManager.calculateWorkoutsThisWeek(),
            icon: CalendarCheck,
            colour: "bg-green-200 dark:bg-[#23443a]",
        },
        {
            label: "Total Sessions",
            value: sessionCount,
            icon: CalendarDays,
            colour: "bg-blue-200 dark:bg-[#243c53]",
        },
        {
            label: "Avg time per session",
            value: formatDuration(averageDuration),
            icon: Timer,
            colour: "bg-yellow-200 dark:bg-[#51462a]",
        },
    ]);
</script>

<header class="flex justify-between items-center space-y-0">
    <h1>Gym Logger</h1>
    <Button variant="ghost" size="icon-lg" aria-label="Profile" onclick={() => goto("/profile")}>
        <User class="size-6 fill-current" />
    </Button>
</header>

<section>
    <Calendar
        type="single"
        bind:value={dateValue}
        class="rounded-md border shadow-sm items-center"
        captionLayout="dropdown"
    />
</section>

<section class="flex gap-3 space-y-0">
    <Button variant="default" class="h-11 min-w-0 flex-1" href="/log"
        ><PencilLine aria-hidden="true" /> Log Session</Button
    >
    <Button variant="outline" class="h-11 min-w-0 flex-1" href="/sessions/new"
        ><Play aria-hidden="true" /> Start Session</Button
    >
</section>

<section class="grid-cols-2 gap-3 space-y-0" aria-label="Workout statistics">
    {#each stats as stat (stat.label)}
        {@const Icon = stat.icon}
        <Card.Root
            class={`min-w-0 flex-row items-center gap-2 p-3 text-zinc-950 dark:text-zinc-100 shadow-none ring-0 sm:gap-4 sm:p-4 `}
        >
            <Icon
                aria-hidden="true"
                class={`size-7 shrink-0 text-zinc-700 dark:text-zinc-200 sm:size-9 ${stat.label === "Streak" ? "fill-current" : ""}`}
            />
            <div class="min-w-0 space-y-1">
                <Card.Title
                    class={`font-medium leading-snug text-zinc-800 dark:text-zinc-100 ${stat.label === "Streak" ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
                    >{stat.label}</Card.Title
                >
                <Card.Content class="p-0">
                    <p
                        class="break-words text-xl font-bold leading-tight tabular-nums sm:text-3xl"
                    >
                        {stat.value}
                    </p>
                </Card.Content>
            </div>
        </Card.Root>
    {/each}
</section>
