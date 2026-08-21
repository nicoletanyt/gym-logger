<script>
    import { cn } from "$lib/utils";
    import { Plus } from "@lucide/svelte";
    import Button, { buttonVariants } from "./ui/button/button.svelte";

    const { onclick } = $props();
</script>

<Button
    class={cn(
        buttonVariants({ variant: "default", size: "icon-lg" }),
        "fixed bottom-24 right-11 z-10 size-11",
    )}
    {onclick}
>
    <Plus />
</Button>
