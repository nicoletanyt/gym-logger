<script lang="ts">
    import SessionCard from "$lib/components/SessionCard.svelte";
    import { sessionManager } from "$lib/Session.svelte";
</script>

<header>
    <h1>Sessions</h1>
</header>

<div class="grid gap-4">
    {#each Object.values(sessionManager.sessions) as session}
        <SessionCard {session} size="default" />
    {:else}
        <p>No Sessions Created</p>
    {/each}
</div>
