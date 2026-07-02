<script lang="ts">
    import favicon from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import "../app.css";
    import { sessionManager } from "$lib/Session.svelte";
    import { routineManager } from "$lib/Routine.svelte";
    import NavBar from "$lib/components/NavBar.svelte";
    import { exerciseManager } from "$lib/Exercise.svelte";

    let { children } = $props();

    onMount(() => {
        // init managers
        sessionManager.loadData();
        routineManager.loadData();
        exerciseManager.loadData();
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col h-screen w-screen p-10 pb-22">
    <main class="flex-1 relative overflow-auto p-1">
        {@render children()}
    </main>
</div>
<NavBar />
