<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { Dumbbell, ArrowRight, Check, Eye, EyeOff, LockKeyhole } from "@lucide/svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import Input from "$lib/components/ui/input/input.svelte";
    import Label from "$lib/components/ui/label/label.svelte";
    import { getSupabase } from "$lib/supabase";
    import { safeNext } from "$lib/auth";
    import { onMount } from "svelte";

    let mode = $state<"sign-in" | "sign-up" | "recover">("sign-in");
    let email = $state("");
    let password = $state("");
    let confirmation = $state("");
    let showPassword = $state(false);
    let busy = $state(false);
    let error = $state("");
    let message = $state("");
    let ready = $state(false);
    onMount(() => { ready = true; });
    const title = $derived(mode === "sign-up" ? "Start your next chapter." : mode === "recover" ? "Back on track." : "Welcome back.");
    function switchMode(next: typeof mode) {
        mode = next; error = ""; message = ""; password = ""; confirmation = "";
    }
    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (busy) return;
        error = ""; message = "";
        if (mode === "sign-up" && password !== confirmation) { error = "Your passwords do not match."; return; }
        busy = true;
        try {
            const client = getSupabase();
            if (mode === "recover") {
                const { error: failure } = await client.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
                });
                if (failure) throw failure;
                message = "If an account exists for that email, a password-reset link is on its way.";
            } else if (mode === "sign-up") {
                const { data, error: failure } = await client.auth.signUp({ email: email.trim(), password,
                    options: { emailRedirectTo: `${location.origin}/auth/callback` },
                });
                if (failure) throw failure;
                password = ""; confirmation = "";
                if (data.session) await goto(safeNext(page.url.searchParams.get("next")), { invalidateAll: true });
                else message = "Check your email to confirm your account, then sign in. If you already have an account, use Sign in instead.";
            } else {
                const { error: failure } = await client.auth.signInWithPassword({ email: email.trim(), password });
                if (failure) throw failure;
                password = "";
                await goto(safeNext(page.url.searchParams.get("next")), { invalidateAll: true });
            }
        } catch (failure) {
            error = failure instanceof Error ? failure.message : "Could not complete sign-in. Please try again.";
        } finally { busy = false; }
    }
</script>

<svelte:head><title>{mode === "sign-up" ? "Create an account" : mode === "recover" ? "Reset password" : "Sign in"} · Gym Logger</title><meta name="description" content="Your workouts, routines, and progress. Sign in to your private Gym Logger account." /></svelte:head>

<main class="min-h-dvh bg-background text-foreground grid lg:grid-cols-2">
    <aside class="hidden lg:flex flex-col justify-between bg-zinc-950 text-white p-12 xl:p-20 relative overflow-hidden">
        <div class="absolute -right-28 top-1/3 size-96 rounded-full bg-green-300/10 blur-3xl" aria-hidden="true"></div>
        <a href="/sign-in" class="relative flex items-center gap-3 font-semibold tracking-tight text-xl"><span class="bg-green-300 text-zinc-950 rounded-xl p-2.5"><Dumbbell class="size-6" /></span> Gym Logger</a>
        <div class="relative max-w-lg space-y-8 py-16">
            <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-green-300"><span class="size-1.5 rounded-full bg-green-300"></span> One workout at a time</span>
            <h1 class="text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">Show up.<br />Log it.<br /><span class="text-green-300">Get stronger.</span></h1>
            <p class="text-zinc-400 text-lg leading-relaxed max-w-sm">A little structure for the work you put in. Keep your routines, workouts, and progress together.</p>
            <div class="space-y-3 text-sm text-zinc-300">
                {#each ["Build routines that work for you", "Track every workout, even on the same day", "Pick up where you left off on any device"] as feature}
                    <p class="flex items-center gap-3"><Check class="size-4 text-green-300" />{feature}</p>
                {/each}
            </div>
        </div>
        <p class="relative text-xs text-zinc-500 flex items-center gap-2"><LockKeyhole class="size-3.5" /> Your training data stays in your account.</p>
    </aside>

    <div class="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div class="mx-auto w-full max-w-sm">
            <div class="mb-12 flex items-center gap-3 font-semibold lg:hidden"><span class="bg-green-300 rounded-xl p-2.5 text-zinc-950"><Dumbbell class="size-6" /></span>Gym Logger</div>
            <p class="text-sm text-muted-foreground mb-3">Your next rep starts here</p>
            <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h2>
            <p class="mt-3 mb-8 text-muted-foreground leading-relaxed">{mode === "sign-up" ? "Create your account and make your progress count." : mode === "recover" ? "Enter your email and we’ll send you a reset link." : "Sign in to your workouts, routines, and progress."}</p>

            {#if page.url.searchParams.get("confirmation") === "failed"}
                <p role="alert" class="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">That email link has expired or could not be verified. Try signing in, or request a fresh reset link. Open confirmation links in the browser where you registered.</p>
            {/if}
            {#if error}<p role="alert" class="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>{/if}
            {#if message}<p role="status" class="mb-5 rounded-lg border border-green-600/20 bg-green-500/5 p-3 text-sm">{message}</p>{/if}

            <form onsubmit={submit} class="space-y-5" aria-busy={busy}>
                <fieldset disabled={busy || !ready} class="space-y-5 min-w-0">
                    <div class="space-y-2"><Label for="email">Email address</Label><Input id="email" type="email" autocomplete="email" required bind:value={email} placeholder="you@example.com" class="h-12" /></div>
                    {#if mode !== "recover"}
                        <div class="space-y-2">
                            <div class="flex justify-between"><Label for="password">Password</Label>{#if mode === "sign-in"}<button type="button" class="text-xs text-muted-foreground hover:text-foreground" onclick={() => switchMode("recover")}>Forgot password?</button>{/if}</div>
                            <div class="relative"><Input id="password" type={showPassword ? "text" : "password"} autocomplete={mode === "sign-up" ? "new-password" : "current-password"} required minlength={mode === "sign-up" ? 8 : undefined} bind:value={password} class="h-12 pr-12" /><button type="button" class="absolute inset-y-0 right-3 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"} onclick={() => showPassword = !showPassword}>{#if showPassword}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}</button></div>
                            {#if mode === "sign-up"}<p class="text-xs text-muted-foreground">Use at least 8 characters.</p>{/if}
                        </div>
                    {/if}
                    {#if mode === "sign-up"}<div class="space-y-2"><Label for="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" autocomplete="new-password" required minlength={8} bind:value={confirmation} class="h-12" /></div>{/if}
                    <Button type="submit" disabled={busy} class="h-12 w-full bg-green-300 text-zinc-950 hover:bg-green-400 font-semibold">{busy ? "Please wait…" : mode === "sign-up" ? "Create account" : mode === "recover" ? "Send reset link" : "Sign in"}{#if !busy}<ArrowRight class="size-4" />{/if}</Button>
                </fieldset>
            </form>
            <p class="mt-7 text-center text-sm text-muted-foreground">{mode === "sign-in" ? "New to Gym Logger?" : mode === "sign-up" ? "Already have an account?" : "Remember your password?"} <button type="button" disabled={busy || !ready} class="font-semibold text-foreground underline underline-offset-4" onclick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}>{mode === "sign-in" ? "Create an account" : "Sign in"}</button></p>
            <p class="mt-12 text-center text-xs text-muted-foreground leading-relaxed">Your workouts are saved securely to your account.<br />Existing browser data is never uploaded automatically.</p>
        </div>
    </div>
</main>
