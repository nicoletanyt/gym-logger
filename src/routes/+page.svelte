<script lang="ts">
    import { ChevronDown, ChevronRight } from "@lucide/svelte";
    import { getLocalTimeZone, today } from "@internationalized/date";
    import { Calendar } from "$lib/components/ui/calendar/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { onMount } from "svelte";
    import type { Session } from "$lib/types";

    let dateValue = $state(today(getLocalTimeZone()));

    let showSessions = $state(false);
    let showRoutines = $state(false);

    let currentSessions = $state([]);
    let calendarData = $derived(
        Object.fromEntries(
            currentSessions.map((s: Session) => [s.date, s.effort]),
        ),
    );

    onMount(() => {
        currentSessions = JSON.parse(
            localStorage.getItem("EXERCISES_STORED") ?? "[]",
        );
    });
    $inspect(currentSessions);
</script>

<header>
    <h1 class="text-center">Gym Logger</h1>
</header>

<section>
    <Calendar
        type="single"
        bind:value={dateValue}
        class="rounded-md border shadow-sm items-center"
        captionLayout="dropdown"
        data={calendarData}
    />
</section>

<section>
    <Button variant="default" class="w-1/2 m-auto" href="/log"
        >Log Session</Button
    >
</section>

<section class="grid-cols-2 gap-5">
    <Card.Root>
        <Card.Header>
            <Card.Title>Total Sessions</Card.Title>
        </Card.Header>
        <Card.Content>
            <p>5</p>
        </Card.Content>
    </Card.Root>
    <Card.Root>
        <Card.Header>
            <Card.Title>Total Sessions</Card.Title>
        </Card.Header>
        <Card.Content>
            <p>5</p>
        </Card.Content>
    </Card.Root>
</section>

<hr />
<section>
    <div class="flex justify-between items-center">
        <h2>All Sessions</h2>
        <Button
            variant="ghost"
            size="icon-lg"
            onclick={() => {
                showSessions = !showSessions;
            }}
        >
            {#if showSessions}
                <ChevronDown />
            {:else}
                <ChevronRight />
            {/if}
        </Button>
    </div>
</section>

<section>
    <div class="flex justify-between items-center">
        <h2>Routines</h2>
        <Button
            variant="ghost"
            size="icon-lg"
            onclick={() => {
                showRoutines = !showRoutines;
            }}
        >
            {#if showRoutines}
                <ChevronDown />
            {:else}
                <ChevronRight />
            {/if}
        </Button>
    </div>
</section>
