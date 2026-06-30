<script lang="ts">
    import favicon from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import "../app.css";
    import { sessionManager } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";

    let { children } = $props();

    onMount(() => {
        // init managers
        sessionManager.loadData();
        routineManager.loadData();
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
