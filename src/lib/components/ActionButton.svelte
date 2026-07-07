<script>
    import { Plus } from "@lucide/svelte";
    import Button from "./ui/button/button.svelte";
    import { cn } from "$lib/utils";

    let { text, onclick, className = "" } = $props();
</script>

<section class={cn("absolute w-full left-0 bottom-0 my-5", className)}>
    <Button variant="secondary" class="bg-green-300" {onclick}>
        <Plus />
        {text}
    </Button>
</section>
