<script lang="ts">
    import { ChevronLeft } from "@lucide/svelte";
    import { page } from "$app/state";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import type { Routine } from "$lib/types";
    import ExerciseManager from "$lib/components/ExerciseManager.svelte";

    const id = page.params.id ?? "";

    const routine = $derived<Routine>(
        JSON.parse(localStorage.getItem("ROUTINES_STORED") ?? "[]")[id],
    );
</script>

<header class="space-y-5 mb-10">
    <Button variant="outline" href="/">
        <ChevronLeft />
        Back
    </Button>
    <h1>{routine.name}</h1>
</header>

<section class="space-y-5">
    <ExerciseManager bind:exercises={routine.exercises} />
</section>

<section>
    <Card.Root size="sm">
        <Card.Header>
            <Card.Title>Total Sessions</Card.Title>
        </Card.Header>
        <Card.Content>
            <p></p>
        </Card.Content>
    </Card.Root>
</section>
