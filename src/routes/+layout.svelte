<script lang="ts">
    import favicon from "$lib/assets/favicon.svg";
    import { onMount, tick, untrack } from "svelte";
    import { browser } from "$app/environment";
    import { page } from "$app/state";
    import { goto, invalidate } from "$app/navigation";
    import "../app.css";
    import { sessionManager } from "$lib/Session.svelte";
    import NavBar from "$lib/components/NavBar.svelte";
    import { cloud } from "$lib/cloud.svelte";
    import { getSupabase } from "$lib/supabase";
    import type { LayoutProps } from "./$types";
    import CreateExercisePage from "$lib/components/CreateExercisePage.svelte";
    import { initializeTheme } from "$lib/theme";

    let { children, data }: LayoutProps = $props();
    const authPage = $derived(page.url.pathname === "/sign-in" || page.url.pathname === "/reset-password" || page.url.pathname.startsWith("/auth/"));
    let main = $state<HTMLElement>();
    let wasCreatingExercise = false;
    let previousScroll = 0;
    onMount(initializeTheme);

    $effect(() => {
        const creating = Boolean(page.state.createExercise && page.route.id !== "/exercises/new");
        if (!main || creating === wasCreatingExercise) return;
        if (creating) previousScroll = main.scrollTop;
        wasCreatingExercise = creating;
        void tick().then(() => {
            if (main && wasCreatingExercise === creating) main.scrollTop = creating ? 0 : previousScroll;
        });
    });

    function syncVerifiedUser(id: string | null) {
        if (id !== cloud.ownerId) sessionManager.resetActiveSession();
        return cloud.setUser(id);
    }

    async function retryLoading() {
        try {
            await invalidate("supabase:auth");
            await syncVerifiedUser(data.user?.id ?? null);
        } catch {
            cloud.error = "Your sign-in could not be verified. Check your connection and retry.";
        }
    }

    $effect(() => {
        const id = data.user?.id ?? null;
        if (!browser) return;
        untrack(() => {
            void syncVerifiedUser(id);
        });
    });

    onMount(() => {
        let authChange = 0;
        let disposed = false;
        const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, session) => {
            const id = session?.user.id ?? null;
            const change = ++authChange;
            if (event === "SIGNED_OUT") {
                cloud.clear();
                sessionManager.resetActiveSession();
                if (page.url.pathname !== "/sign-in") void goto("/sign-in", { invalidateAll: true });
                else void invalidate("supabase:auth");
                return;
            }

            // An INITIAL_SESSION notification can arrive late with a stale/null
            // session. It is not a sign-out. Keep the verified account's data
            // until server reconciliation, rather than clearing it to an idle
            // state which depends on layout data changing to restart the load.
            if (id && cloud.ownerId && id !== cloud.ownerId) {
                cloud.clear();
                sessionManager.resetActiveSession();
            }
            if (event === "INITIAL_SESSION" && id === (data.user?.id ?? null) && id === cloud.ownerId) return;

            // The callback stays synchronous: Supabase Auth may hold a lock here.
            // Explicitly reconcile after invalidation even when SvelteKit retains
            // the same server data. Ignore superseded callbacks and unmounts.
            void invalidate("supabase:auth").then(() => {
                if (!disposed && change === authChange) return syncVerifiedUser(data.user?.id ?? null);
            }).catch(() => {
                if (!disposed && change === authChange) cloud.error = "Your sign-in could not be verified. Check your connection and retry.";
            });
        });
        return () => { disposed = true; subscription.unsubscribe(); };
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{#if authPage}
    {@render children()}
{:else}
<div class="box-border flex flex-col h-dvh w-full p-6 sm:p-10 pb-22">
    <main bind:this={main} class="box-border min-h-0 min-w-0 flex-1 relative overflow-auto p-1">
        {#if cloud.error}
            <div role="alert" class="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-2">
                <p>{cloud.error}</p>
                {#if cloud.ready && !cloud.needsReload}
                    <button type="button" class="underline font-medium" onclick={() => {
                        if (confirm("Reload the latest data? Any unsaved edits on this page will be lost.")) location.reload();
                    }}>Reload latest data</button>
                {/if}
            </div>
        {/if}
        {#if !data.user || (!cloud.ready && (cloud.loading || !cloud.error))}
            <p role="status">Loading your workouts…</p>
        {:else if !cloud.ready}
            <p class="mb-3">Your workouts could not be loaded. Existing data has not been removed.</p>
            <button type="button" class="underline" onclick={retryLoading}>Retry loading</button>
        {:else}
            {#if cloud.needsReload}
                <button type="button" class="mb-3 underline" disabled={cloud.loading} onclick={() => cloud.reload()}>{cloud.loading ? "Loading latest data…" : "Retry loading saved data"}</button>
            {/if}
            {#if cloud.saving}<p role="status" class="mb-3 text-sm text-muted-foreground">Saving to Supabase…</p>{/if}
            {#key cloud.ownerId}
                <fieldset class="contents" disabled={cloud.saving || cloud.needsReload || cloud.loading}>
                    <div class="h-full" hidden={Boolean(page.state.createExercise && page.route.id !== "/exercises/new")}>
                        {@render children()}
                    </div>
                    {#if page.state.createExercise && page.route.id !== "/exercises/new"}
                        <CreateExercisePage name={page.state.createExercise.name} token={page.state.createExercise.token} />
                    {/if}
                </fieldset>
            {/key}
        {/if}
    </main>
</div>
<NavBar />
{/if}
