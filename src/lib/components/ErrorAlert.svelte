<script lang="ts">
    import { CircleAlert, X } from "@lucide/svelte";
    import { fade } from "svelte/transition";
    import { browser } from "$app/environment";
    import * as Alert from "$lib/components/ui/alert/index.js";
    let { message, ondismiss }: { message: string; ondismiss: () => void } = $props();

    $effect(() => {
        message;
        const timer = setTimeout(() => ondismiss(), 5000);
        return () => clearTimeout(timer);
    });
</script>

<div
    class="fixed top-4 right-4 z-[100] w-[calc(100%-2rem)] max-w-sm cursor-pointer rounded-lg shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    role="button"
    tabindex="0"
    aria-label="Dismiss error notification"
    out:fade={{ duration: browser && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200 }}
    onclick={ondismiss}
    onkeydown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            ondismiss();
        }
    }}
>
    <Alert.Root variant="destructive" class="pr-10">
        <CircleAlert />
        <Alert.Title>There’s a problem</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
        <X aria-hidden="true" class="absolute top-3 right-3 size-4" />
    </Alert.Root>
</div>
