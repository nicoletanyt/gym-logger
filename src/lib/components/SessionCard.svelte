<script lang="ts">
    import { CalendarDays } from "@lucide/svelte";
    import type { Session } from "$lib/Session.svelte";
    import LibraryCard from "./LibraryCard.svelte";
    import WorkoutCardMeta from "./WorkoutCardMeta.svelte";
    import ExercisePreview from "./ExercisePreview.svelte";

    let { session }: { session: Session } = $props();
</script>

{#snippet preview()}
    <ExercisePreview exercises={session.exercises} />
{/snippet}

<LibraryCard title={session.date} href={`/sessions/${session.id}`} tintedHeader children={session.exercises.length > 0 ? preview : undefined}>
    {#snippet heading()}
        <span class="flex flex-wrap items-center gap-1.5">
            <CalendarDays class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <time datetime={session.date}>{session.date}</time>
            {#if session.startTime}
                <span class="text-xs font-normal text-muted-foreground">{session.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            {/if}
        </span>
    {/snippet}
    {#snippet meta()}
        <WorkoutCardMeta exerciseCount={session.exercises.length} duration={session.duration} />
    {/snippet}
</LibraryCard>
