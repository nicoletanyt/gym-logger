<script>
    import { Plus } from "@lucide/svelte";
    import Button from "./ui/button/button.svelte";
    import { cn } from "$lib/utils";

    let {
        text,
        onclick,
        onOverlay = false,
        className = "",
        icon = null,
    } = $props();
</script>

<section
    class={cn(
        "fixed left-10 right-10 w-[calc(100%-5rem)]",
        onOverlay ? "bottom-0" : "bottom-14",
        className,
    )}
>
    <Button variant="secondary" class="bg-green-300" {onclick}>
        {#if icon}
            {@render icon()}
        {:else}
            <Plus />
        {/if}
        {text}
    </Button>
</section>
