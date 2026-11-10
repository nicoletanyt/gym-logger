<script lang="ts">
    import { cn } from "$lib/utils";
    import Label from "./ui/label/label.svelte";

    let { label, id = undefined, children, controlClass = "" } = $props();
</script>

<div class="grid min-w-0 gap-2">
    <Label for={id} class="text-sm font-medium">{label}</Label>
    <div class={cn("min-w-0 w-full", controlClass)}>
        {@render children()}
    </div>
</div>
