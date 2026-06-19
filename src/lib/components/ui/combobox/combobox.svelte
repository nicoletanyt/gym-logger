<script lang="ts">
    import CheckIcon from "@lucide/svelte/icons/check";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
    import { tick } from "svelte";
    import * as Command from "$lib/components/ui/command/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { cn } from "$lib/utils.js";

    type Options = {
        value: string;
        label: string;
    };

    let {
        ref = $bindable(null),
        options = $bindable<Options[]>(),
        noun,
        value = $bindable<string>(""),
        class: className = "",
        ...restProps
    } = $props();

    let open = $state(false);
    // let value = $state("");
    let triggerRef = $state<HTMLButtonElement>(null!);

    const selectedValue = $derived(
        options.find((f: any) => f.value === value)?.label,
    );

    function closeAndFocusTrigger() {
        open = false;
        tick().then(() => {
            triggerRef.focus();
        });
    }
</script>

<Popover.Root bind:open {...restProps}>
    <Popover.Trigger bind:ref={triggerRef}>
        {#snippet child({ props })}
            <Button
                {...props}
                variant="outline"
                class="w-1/2 justify-between"
                role="combobox"
                aria-expanded={open}
            >
                {selectedValue || `Select a ${noun} ...`}
                <ChevronsUpDownIcon class="opacity-50" />
            </Button>
        {/snippet}
    </Popover.Trigger>
    <Popover.Content class={cn("w-45 p-0", className)}>
        <Command.Root>
            <Command.Input placeholder={`Search ${noun}...`} />
            <Command.List>
                <Command.Empty>No option found.</Command.Empty>
                <Command.Group value="options">
                    {#each options as option (option.value)}
                        <Command.Item
                            value={option.value}
                            onSelect={() => {
                                value = option.value;
                                closeAndFocusTrigger();
                            }}
                        >
                            <CheckIcon
                                class={cn(
                                    value !== option.value &&
                                        "text-transparent",
                                )}
                            />
                            {option.label}
                        </Command.Item>
                    {/each}
                </Command.Group>
            </Command.List>
        </Command.Root>
    </Popover.Content>
</Popover.Root>
