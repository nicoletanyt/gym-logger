<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";

    type size = "sm" | "default";

    let {
        title = "",
        size = "default",
        icon = null,
        content = "",
    }: {
        title?: string;
        size?: size;
        icon?: any;
        content?: string;
    } = $props();
</script>

<Card.Root {size} class="h-full">
    {#if size == "default"}
        <Card.Title class="px-6">
            {title}
        </Card.Title>
    {/if}
    <Card.Content class="flex gap-2 justify-start items-center my-auto">
        {#if icon}
            {@render icon()}
        {/if}
        <p>{content}</p>
    </Card.Content>
</Card.Root>
