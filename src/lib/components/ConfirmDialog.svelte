<script lang="ts">
    import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
    import { buttonVariants } from "$lib/components/ui/button/index.js";
    import { cn } from "$lib/utils";

    let {
        trigger,
        onconfirm,
        buttonClass = "",
        buttonVar = "destructive",
        title = "",
        description = "",
    } = $props();
</script>

<AlertDialog.Root>
    <AlertDialog.Trigger
        class={cn(
            buttonVariants({
                variant: buttonVar as
                    | "destructive"
                    | "outline"
                    | "default"
                    | "ghost"
                    | "link",
            }),
            buttonClass,
        )}
    >
        {#if trigger}
            {@render trigger()}
        {/if}
    </AlertDialog.Trigger>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>
                {#if title}
                    {title}
                {:else}
                    Are you absolutely sure?
                {/if}
            </AlertDialog.Title>
            <AlertDialog.Description>
                {#if description}
                    {description}
                {:else}
                    The data will be deleted FOREVER D:",
                {/if}
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onclick={onconfirm}>Continue</AlertDialog.Action
            >
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
