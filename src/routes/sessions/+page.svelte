<script lang="ts">
    import { goto } from "$app/navigation";
    import SessionCard from "$lib/components/SessionCard.svelte";
    import { sessionManager } from "$lib/Session.svelte";
</script>

<header>
    <h1>Sessions</h1>
</header>

<div class="grid gap-6">
    {#each Object.values(sessionManager.sessions) as session}
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
