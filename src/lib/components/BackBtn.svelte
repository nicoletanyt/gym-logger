<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { ChevronLeft } from "@lucide/svelte";

    let { dest = "/" } = $props();
</script>

<Button variant="outline" href={dest}>
    <ChevronLeft />
    Back
</Button>
