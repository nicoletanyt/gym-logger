<script>
    import { cn } from "$lib/utils";
    import { Plus } from "@lucide/svelte";
    import Button, { buttonVariants } from "./ui/button/button.svelte";

    const { onclick } = $props();
</script>

<Button
    class={cn(
        buttonVariants({ variant: "default", size: "icon-lg" }),
        "absolute bottom-5 right-0",
    )}
    {onclick}
>
    <Plus />
</Button>
