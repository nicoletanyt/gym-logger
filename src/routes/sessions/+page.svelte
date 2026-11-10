<script lang="ts">
    import SessionCard from "$lib/components/SessionCard.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { sessionManager, compareSessions } from "$lib/Session.svelte";
    import { ArrowDown, ArrowUp, CalendarDays, ListFilter, Plus, X } from "@lucide/svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import FieldIcon from "$lib/components/FieldIcon.svelte";
    import Field from "$lib/components/Field.svelte";

    const sortOptions = [
        { value: "date", label: "Date" },
        { value: "duration", label: "Duration" },
    ] as const;
    let sortBy = $state<"date" | "duration">("date");
    let sortDirection = $state<"asc" | "desc">("desc");
    let searchDate = $state("");
    let sortedSessions = $derived(
        Object.values(sessionManager.sessions).filter((session) => !searchDate || session.date === searchDate).sort((a, b) => {
            const comparison =
                sortBy == "date"
                    ? -compareSessions(a, b)
                    : a.duration - b.duration;
            return sortDirection == "asc" ? comparison : -comparison;
        }),
    );
</script>

<header class="flex justify-between items-center space-y-0">
    <h1>Sessions</h1>
    <Popover.Root>
        <Popover.Trigger>
            {#snippet child({ props })}
                <Button
                    {...props}
                    variant="outline"
                    size="icon"
                    class="size-11 rounded-xl"
                    aria-label="Filter sessions"
                >
                    <ListFilter aria-hidden="true" />
                </Button>
            {/snippet}
        </Popover.Trigger>
        <Popover.Content
            align="end"
            class="w-52 gap-0 rounded-2xl border border-border/60 bg-popover/90 p-1.5 shadow-xl backdrop-blur-xl"
        >
            <div role="group" aria-label="Sort sessions" class="grid gap-0.5">
                {#each sortOptions as option}
                    <Button
                        variant="ghost"
                        class="h-11 w-full justify-between rounded-xl px-3 text-base aria-pressed:bg-muted/80 aria-pressed:text-foreground"
                        aria-pressed={sortBy == option.value}
                        aria-label={`Sort by ${option.label.toLowerCase()}${sortBy == option.value ? `: ${sortDirection == "asc" ? "ascending" : "descending"}` : ""}`}
                        onclick={() => {
                            if (sortBy == option.value) {
                                sortDirection = sortDirection == "asc" ? "desc" : "asc";
                            } else {
                                sortBy = option.value;
                                sortDirection = "desc";
                            }
                        }}
                    >
                        {option.label}
                        {#if sortBy == option.value}
                            {#if sortDirection == "desc"}
                                <ArrowDown class="size-4 text-muted-foreground" aria-hidden="true" />
                            {:else}
                                <ArrowUp class="size-4 text-muted-foreground" aria-hidden="true" />
                            {/if}
                        {/if}
                    </Button>
                {/each}
            </div>
        </Popover.Content>
    </Popover.Root>
</header>

<div class="mb-6">
    <Field label="Search by date" id="session-search-date">
        <div class="flex min-w-0 items-center gap-2">
            <FieldIcon icon={CalendarDays} class="min-w-0 flex-1">
                <Input id="session-search-date" type="date" aria-label="Search sessions by date" class="h-11 pl-10" bind:value={searchDate} />
            </FieldIcon>
            {#if searchDate}
                <Button variant="outline" class="size-11 shrink-0" size="icon" aria-label="Clear date search" onclick={() => searchDate = ""}><X aria-hidden="true" /></Button>
            {/if}
        </div>
    </Field>
</div>

<div class="grid grid-cols-1 gap-3 sm:gap-6">
    {#each sortedSessions as session (session.id)}
        <SessionCard {session} />
    {:else}
        <div class="grid justify-items-center gap-4 py-10 text-center">
            {#if Object.keys(sessionManager.sessions).length > 0}
                <p class="text-muted-foreground" role="status">No sessions on this date.</p>
                <Button variant="outline" class="min-h-11" onclick={() => searchDate = ""}>Show all sessions</Button>
            {:else}
                <p class="text-muted-foreground">No Sessions Created</p>
                <Button href="/log" class="min-h-11"><Plus aria-hidden="true" />Log Session</Button>
            {/if}
        </div>
    {/each}
</div>
