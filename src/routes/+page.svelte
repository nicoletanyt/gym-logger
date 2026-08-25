<script lang="ts">
    import { ChevronDown, ChevronRight } from "@lucide/svelte";
    import { getLocalTimeZone, today } from "@internationalized/date";
    import { Calendar } from "$lib/components/ui/calendar/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { goto } from "$app/navigation";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import { sessionManager } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import { exerciseManager } from "$lib/Exercise.svelte";
    import MetricDisplay from "$lib/components/MetricDisplay.svelte";
    import { formatDuration } from "$lib/constants";

    let dateValue = $state(today(getLocalTimeZone()));

    let showSections = $state({
        sessions: false,
        routines: true,
        settings: true,
    });
</script>

{#snippet toggleHeading(heading: string, show: boolean, onclick: any)}
    <div class="flex justify-between items-center">
        <h2>{heading}</h2>
        <Button variant="ghost" size="icon-lg" {onclick}>
            {#if show}
                <ChevronDown />
            {:else}
                <ChevronRight />
            {/if}
        </Button>
    </div>
{/snippet}

<header>
    <h1>Gym Logger</h1>
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
</section>

<hr />

<section class="space-y-5">
    {@render toggleHeading(
        "Settings",
        showSections.settings,
        () => (showSections.settings = !showSections.settings),
    )}

    {#if showSections.settings}
        <div class="grid gap-3">
            <ConfirmDialog
                onconfirm={() => {
                    localStorage.clear();
                    location.reload();
                }}
            >
                {#snippet trigger()}
                    Delete Data
                {/snippet}
            </ConfirmDialog>
            <Button
                onclick={() => {
                    goto("/import");
                }}
                variant={"secondary"}
            >
                Import Data
            </Button>
        </div>
    {/if}
</section>
