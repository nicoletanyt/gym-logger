<script lang="ts">
    import { CalendarCheck, CalendarDays, Flame, Timer, User } from "@lucide/svelte";
    import { getLocalTimeZone, today } from "@internationalized/date";
    import { Calendar } from "$lib/components/ui/calendar/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { goto } from "$app/navigation";
    import { sessionManager } from "$lib/Session.svelte";
    import { formatDuration } from "$lib/constants";

    let dateValue = $state(today(getLocalTimeZone()));
    const streak = $derived(sessionManager.calculateStreak());
    const stats = $derived([
        { label: "Streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, icon: Flame, colour: "bg-pink-200 dark:bg-[#513240]" },
        { label: "Workouts this week", value: sessionManager.calculateWorkoutsThisWeek(), icon: CalendarCheck, colour: "bg-green-200 dark:bg-[#23443a]" },
        { label: "Total Sessions", value: sessionManager.getCount(), icon: CalendarDays, colour: "bg-blue-200 dark:bg-[#243c53]" },
        { label: "Total Time", value: formatDuration(sessionManager.getTotalDuration()), icon: Timer, colour: "bg-yellow-200 dark:bg-[#51462a]" },
    ]);
</script>

<header class="flex justify-between items-center space-y-0">
    <h1>Gym Logger</h1>
    <Button variant="secondary" size="icon-lg" onclick={() => goto("/profile")}>
        <User />
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
        >Log Session</Button
    >
    <Button variant="outline" class="h-11 min-w-0 flex-1" href="/sessions/new"
        >Start Session</Button
    >
</section>

<section class="grid-cols-2 gap-3 space-y-0" aria-label="Workout statistics">
    {#each stats as stat (stat.label)}
        {@const Icon = stat.icon}
        <Card.Root class={`min-w-0 gap-4 p-4 text-zinc-950 dark:text-zinc-100 shadow-none ring-0 ${stat.colour}`}>
            <Card.Header class="flex items-start justify-between gap-2 p-0">
                <Card.Title class="text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-100">{stat.label}</Card.Title>
                <Icon aria-hidden="true" class="size-5 shrink-0 text-zinc-700 dark:text-zinc-200" />
            </Card.Header>
            <Card.Content class="mt-auto p-0">
                <p class="break-words text-2xl font-bold leading-tight tabular-nums sm:text-3xl">{stat.value}</p>
            </Card.Content>
        </Card.Root>
    {/each}
</section>
