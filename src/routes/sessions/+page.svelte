<script lang="ts">
    import { goto } from "$app/navigation";
    import SessionCard from "$lib/components/SessionCard.svelte";
    import { sessionManager } from "$lib/Session.svelte";
</script>

<header>
    <h1>Sessions</h1>
</header>

<div class="grid gap-6">
    {#each Object.entries(sessionManager.sessions) as [storageKey, session]}
        <SessionCard
            {session}
            onclick={() => {
                goto(`/sessions/${encodeURIComponent(storageKey)}`);
            }}
        />
    {:else}
        <p>No Sessions Created</p>
    {/each}
</div>
