<script lang="ts">
    import CheckIcon from "@lucide/svelte/icons/check";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
    import { tick } from "svelte";
    import * as Command from "$lib/components/ui/command/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { cn } from "$lib/utils.js";

    type Options = { value: string; label: string };
    let {
        ref = $bindable(null),
        options = $bindable<Options[]>(),
        noun,
        onChange = () => {},
        onCreate,
        value = $bindable<string>(""),
        class: className = "",
        ...restProps
    }: {
        ref?: HTMLButtonElement | null;
        options: Options[];
        noun: string;
        onChange?: () => void;
        onCreate?: (name: string) => void;
        value?: string;
        class?: string;
        [key: string]: any;
    } = $props();

    let open = $state(false);
    let search = $state("");
    let triggerRef = $state<HTMLButtonElement>(null!);
    let haveMatch = $derived(
        options.some((o: Options) =>
            o.label.toLowerCase().includes(search.trim().toLowerCase()),
        ),
    );
    const selectedValue = $derived(
        options.find((f: any) => f.value === value)?.label,
    );
    function closeAndFocusTrigger() {
        open = false;
        tick().then(() => {
            triggerRef.focus();
        });
    }
    function handleCreate() {
        const name = search.trim();
        if (!name || !onCreate) return;
        onCreate(name);
        closeAndFocusTrigger();
    }
</script>

<Popover.Root bind:open {...restProps}>
    <Popover.Trigger bind:ref={triggerRef}>
        {#snippet child({ props })}
            <Button
                {...props}
                variant="outline"
                class="w-full justify-between"
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
            <Command.Input
                placeholder={`Search ${noun}...`}
                bind:value={search}
            />
            <Command.List>
                <Command.Empty>No {noun} found.</Command.Empty>
                <Command.Group value="options">
                    {#each options as option (option.value)}
                        <Command.Item
                            value={option.label}
                            onSelect={() => {
                                value = option.value;
                                onChange();
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
                    {#if onCreate && !haveMatch && search.trim()}
                        <Command.Item
                            value={search.trim()}
                            onSelect={handleCreate}
                        >
                            Create "{search.trim()}"
                        </Command.Item>
                    {/if}
                </Command.Group>
            </Command.List>
        </Command.Root>
    </Popover.Content>
</Popover.Root>
