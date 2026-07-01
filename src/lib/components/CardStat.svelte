<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";

    type size = "sm" | "default";

    let { title = "", size: size, icon = null, content = "" } = $props();
</script>

<Card.Root {size}>
    {#if size == "default"}
        <Card.Title>
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
