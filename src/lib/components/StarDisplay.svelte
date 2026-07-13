<script>
    import { Star } from "@lucide/svelte";
    import Button from "./ui/button/button.svelte";
    import { cn } from "$lib/utils";

    let { value = $bindable(), className = "", editable = true } = $props();
</script>

<div class={cn("flex justify-between", className)}>
    {#each Array.from({ length: 5 }, (_, i) => i + 1) as num}
        <Button
            variant={editable ? "outline" : "ghost"}
            size="icon-sm"
            onclick={() => {
                if (editable) value = num;
            }}
        >
            <Star class="w-fit" fill={num <= value ? "primary" : "none"} />
        </Button>
    {/each}
</div>
