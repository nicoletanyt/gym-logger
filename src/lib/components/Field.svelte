<script lang="ts">
    import { cn } from "$lib/utils";
    import Label from "./ui/label/label.svelte";

    let { label, children, controlClass = "" } = $props();
</script>

<div class="flex justify-between">
    <Label class="shrink-0">{label}</Label>
    <div class={cn("w-1/2", controlClass)}>
        {@render children()}
    </div>
</div>
