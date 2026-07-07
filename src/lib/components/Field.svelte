<script lang="ts">
    import Label from "./ui/label/label.svelte";

    let { label, children } = $props();
</script>

<div class="flex justify-between">
    <Label class="shrink-0">{label}</Label>
    <div class="w-1/2">
        {@render children()}
    </div>
</div>
