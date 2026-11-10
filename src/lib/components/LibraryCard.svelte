<script lang="ts">
    import type { Snippet } from "svelte";
    import { ChevronRight } from "@lucide/svelte";
    import * as Card from "$lib/components/ui/card/index.js";
    import { Checkbox } from "$lib/components/ui/checkbox/index.js";

    let {
        title,
        href,
        selectable = false,
        selected = false,
        onselect,
        image,
        heading,
        meta,
        children,
        tintedHeader = false,
    }: {
        title: string;
        href?: string;
        selectable?: boolean;
        selected?: boolean;
        onselect?: () => void;
        image?: Snippet;
        heading?: Snippet;
        meta?: Snippet;
        children?: Snippet;
        tintedHeader?: boolean;
    } = $props();
</script>

<div class="flex min-w-0 items-center gap-3">
    {#if selectable}
        <Checkbox class="size-6 shrink-0" aria-label={`Select ${title}`} checked={selected} onCheckedChange={() => onselect?.()} />
    {/if}
    <Card.Root class="min-w-0 flex-1 gap-0 py-0 shadow-none {selected ? 'ring-2 ring-primary' : ''}">
        <svelte:element
            this={href ? "a" : "div"}
            href={selectable ? undefined : href}
            role={selectable ? "button" : undefined}
            tabindex={selectable ? 0 : undefined}
            aria-label={selectable || href ? title : undefined}
            aria-pressed={selectable ? selected : undefined}
            class="block min-w-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring {selectable || href ? 'cursor-pointer hover:bg-accent/50' : ''}"
            onclick={(event: MouseEvent) => {
                if (selectable) {
                    event.preventDefault();
                    onselect?.();
                }
            }}
            onkeydown={(event: KeyboardEvent) => {
                if (selectable && (event.key === " " || event.key === "Enter")) {
                    event.preventDefault();
                    onselect?.();
                }
            }}
        >
            <Card.Content class="px-0">
                <div data-slot="library-card-header" class="flex items-center gap-3 px-4 py-5 sm:px-6 {tintedHeader ? 'bg-zinc-200 text-zinc-950 [--muted-foreground:var(--color-zinc-600)]' : ''}">
                    {@render image?.()}
                    <div class="min-w-0 flex-1 space-y-1.5">
                        <h2 class="text-base font-bold leading-snug wrap-anywhere">{#if heading}{@render heading()}{:else}{title}{/if}</h2>
                        {@render meta?.()}
                    </div>
                    {#if href && !selectable}
                        <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {/if}
                </div>
                {#if children}
                    <div data-slot="library-card-body" class="px-4 pb-5 sm:px-6">
                        {@render children()}
                    </div>
                {/if}
            </Card.Content>
        </svelte:element>
    </Card.Root>
</div>
