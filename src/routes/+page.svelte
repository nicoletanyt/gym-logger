<script lang="ts">
    import { User } from "@lucide/svelte";
    import { getLocalTimeZone, today } from "@internationalized/date";
    import { Calendar } from "$lib/components/ui/calendar/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { goto } from "$app/navigation";
    import { sessionManager } from "$lib/Session.svelte";
    import { formatDuration } from "$lib/constants";

    let dateValue = $state(today(getLocalTimeZone()));
</script>

<header class="flex justify-between items-center space-y-0">
    <h1>Gym Logger</h1>
    <Button variant="secondary" size="icon-lg" onclick={() => goto("/profile")}>
        <User fill={"#18181b"} />
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

<section class="grid gap-3">
    <Button variant="default" class="w-1/2 m-auto" href="/log"
        >Log Session</Button
    >
    <Button variant="default" class="w-1/2 m-auto" href="/sessions/new"
        >Start Session</Button
    >
</section>

<section class="grid-cols-2 gap-5">
    <Card.Root class="h-full">
        <Card.Header>
            <Card.Title>Total Sessions</Card.Title>
        </Card.Header>
        <Card.Content class="flex h-full">
            <p class="text-lg">
                <span class="font-bold">{sessionManager.getCount()}</span>
            </p>
        </Card.Content>
    </Card.Root>
    <Card.Root class="h-full">
        <Card.Header>
            <Card.Title>Total Time</Card.Title>
        </Card.Header>
        <Card.Content class="flex h-full">
            <p class="text-lg">
                <span class="font-bold"
                    >{formatDuration(sessionManager.getTotalDuration())}</span
                >
            </p>
        </Card.Content>
    </Card.Root>
    <Card.Root class="h-full">
        <Card.Header>
            <Card.Title>Streak</Card.Title>
        </Card.Header>
        <Card.Content class="flex h-full">
            <p class="text-lg">
                <span class="font-bold"
                    >{sessionManager.calculateStreak()} days</span
                >
            </p>
        </Card.Content>
    </Card.Root>
    <Card.Root class="h-full">
        <Card.Header>
            <Card.Title>Workouts this week</Card.Title>
        </Card.Header>
        <Card.Content class="flex h-full">
            <p class="text-lg">
                <span class="font-bold"
                    >{sessionManager.calculateWorkoutsThisWeek()}</span
                >
            </p>
        </Card.Content>
    </Card.Root>
</section>
