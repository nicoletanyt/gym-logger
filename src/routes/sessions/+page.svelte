<script lang="ts">
    import { goto } from "$app/navigation";
    import SessionCard from "$lib/components/SessionCard.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { sessionManager } from "$lib/Session.svelte";
    import { ArrowDown, ArrowUp, ListFilter } from "@lucide/svelte";

    const sortOptions = [
        { value: "date", label: "Date" },
        { value: "duration", label: "Duration" },
    ] as const;
    let sortBy = $state<"date" | "duration">("date");
    let sortDirection = $state<"asc" | "desc">("desc");
    let sortedSessions = $derived(
        Object.values(sessionManager.sessions).sort((a, b) => {
            const comparison =
                sortBy == "date"
                    ? a.date.localeCompare(b.date)
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

<div class="grid gap-6">
    {#each sortedSessions as session (session.date)}
        <SessionCard
            {session}
            onclick={() => {
                goto(`/sessions/${session.date}`);
            }}
        />
    {:else}
        <p>No Sessions Created</p>
    {/each}
</div>
