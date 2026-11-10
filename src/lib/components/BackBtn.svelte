<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { ChevronLeft } from "@lucide/svelte";

    let { dest = "/", iconOnly = false } = $props();
</script>

<Button variant="outline" href={dest} size={iconOnly ? "icon" : "default"} aria-label={iconOnly ? "Back" : undefined}>
    <ChevronLeft />
    {#if !iconOnly}Back{/if}
</Button>
