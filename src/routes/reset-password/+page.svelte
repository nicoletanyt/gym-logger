<script lang="ts">
    import { goto } from "$app/navigation";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import Label from "$lib/components/ui/label/label.svelte";
    import { getSupabase } from "$lib/supabase";
    import { onMount } from "svelte";
    let password = $state("");
    let confirmation = $state("");
    let busy = $state(false);
    let error = $state("");
    let ready = $state(false);
    onMount(() => { ready = true; });
    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (busy) return;
        if (password !== confirmation) { error = "Your passwords do not match."; return; }
        busy = true; error = "";
        try {
            const { error: failure } = await getSupabase().auth.updateUser({ password });
            if (failure) throw failure;
            await goto("/", { invalidateAll: true });
        } catch (failure) { error = failure instanceof Error ? failure.message : "Could not change your password."; }
        finally { busy = false; }
    }
</script>
<svelte:head><title>Choose a new password · Gym Logger</title></svelte:head>
<main class="min-h-dvh flex items-center justify-center px-6">
    <div class="w-full max-w-sm space-y-6">
        <h1 class="text-3xl font-semibold">Choose a new password</h1>
        {#if error}<p role="alert" class="text-destructive">{error}</p>{/if}
        <form onsubmit={submit} class="space-y-5">
            <div class="space-y-2"><Label for="new-password">New password</Label><Input id="new-password" type="password" required minlength={8} autocomplete="new-password" bind:value={password} /></div>
            <div class="space-y-2"><Label for="confirmation">Confirm password</Label><Input id="confirmation" type="password" required minlength={8} autocomplete="new-password" bind:value={confirmation} /></div>
            <Button type="submit" disabled={busy || !ready} class="w-full">{busy ? "Saving…" : "Save password"}</Button>
        </form>
        <a href="/" class="text-sm underline">Back to Gym Logger</a>
    </div>
</main>
