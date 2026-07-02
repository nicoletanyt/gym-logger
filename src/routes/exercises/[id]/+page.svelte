<script lang="ts">
    import { page } from "$app/state";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import MetricTypeTag from "$lib/components/MetricTypeTag.svelte";
    import { exerciseManager, METRICS } from "$lib/Exercise.svelte";

    const id = page.params.id ?? "";
    const exercise = $derived(exerciseManager.getById(id));
</script>

<header>
    <BackBtn dest="/exercises" />
    <h1>{exercise.name}</h1>
    <MetricTypeTag metric={METRICS[exercise.metricType]} />
</header>

<!-- METRICS -->
<section></section>
