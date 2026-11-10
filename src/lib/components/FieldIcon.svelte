<script lang="ts">
    import type { LucideIcon } from "@lucide/svelte";
    import type { Snippet } from "svelte";
    import { cn } from "$lib/utils";

    let { icon: Icon, children, class: className = "", multiline = false }: {
        icon: LucideIcon;
        children: Snippet;
        class?: string;
        multiline?: boolean;
    } = $props();
</script>

<span class={cn("relative block min-w-0", className)}>
    <Icon aria-hidden="true" class={cn("pointer-events-none absolute left-3 z-10 size-4 text-muted-foreground", multiline ? "top-3" : "top-1/2 -translate-y-1/2")} />
    {@render children()}
</span>
