<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { goto } from "$app/navigation";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { page } from "$app/state";
    import { getSupabase } from "$lib/supabase";
    import { cloud } from "$lib/cloud.svelte";
    import { STORAGE_KEYS } from "$lib/constants";
    import { onMount } from "svelte";
    import { getThemePreference, setThemePreference, THEME_STORAGE_KEY, type ThemePreference } from "$lib/theme";
    import { Monitor, Moon, Sun } from "@lucide/svelte";

    let signingOut = $state(false);
    let error = $state("");
    let hasLegacyData = $state(false);
    let appearance = $state<ThemePreference>("system");
    onMount(() => {
        appearance = getThemePreference();
        const onStorage = (event: StorageEvent) => {
            if (event.key === THEME_STORAGE_KEY || event.key === null) appearance = getThemePreference();
        };
        window.addEventListener("storage", onStorage);
        try { hasLegacyData = Object.values(STORAGE_KEYS).some((key) => localStorage.getItem(key) !== null); }
        catch { /* Browser storage may be disabled; cloud storage still works. */ }
        return () => window.removeEventListener("storage", onStorage);
    });
    function download(value: unknown, name: string) {
        const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = name;
        document.body.append(anchor); anchor.click(); anchor.remove();
        URL.revokeObjectURL(url);
    }
    function exportCloud() {
        download({ version: 1, exportedAt: new Date().toISOString(), ...$state.snapshot(cloud.data) }, "gym-logger-backup.json");
    }
    function exportLegacy() {
        try {
            const data = Object.fromEntries(Object.entries(STORAGE_KEYS).map(([name, key]) => [name, JSON.parse(localStorage.getItem(key) ?? "null")]));
            download({ version: "legacy-local", ...data }, "gym-logger-local-backup.json");
        } catch { error = "Could not read the existing browser backup. No data was changed."; }
    }
    async function signOut() {
        if (signingOut) return;
        signingOut = true; error = "";
        try {
            const { error: failure } = await getSupabase().auth.signOut({ scope: "local" });
            if (failure) throw failure;
            cloud.clear();
            await goto("/sign-in", { invalidateAll: true });
        } catch (failure) { error = failure instanceof Error ? failure.message : "Could not sign out."; }
        finally { signingOut = false; }
    }
</script>

<header>
    <div class="flex items-center gap-4">
    <BackBtn />
    <h1 class="min-w-0 text-2xl sm:text-3xl">Profile</h1>
    </div>
    <p class="text-muted-foreground">{page.data.user?.email}</p>
</header>

<section class="space-y-3">
    <div class="space-y-1">
        <h2>Appearance</h2>
        <p class="text-sm text-muted-foreground">Choose how Gym Logger looks on this device.</p>
    </div>
    <fieldset class="grid grid-cols-3 gap-2" aria-label="Appearance">
        {#each [{ value: "system", label: "System", icon: Monitor }, { value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }] as option}
            <label class="flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring {appearance === option.value ? 'border-foreground bg-muted' : 'border-border bg-card hover:bg-muted'}">
                <input type="radio" class="sr-only" name="appearance" value={option.value} checked={appearance === option.value} onchange={() => { appearance = option.value as ThemePreference; setThemePreference(appearance); }} />
                <option.icon aria-hidden="true" class="size-5" />
                {option.label}
            </label>
        {/each}
    </fieldset>
</section>

<section class="space-y-3">
    <Button
        onclick={() => {
            goto("/import");
        }}
        variant={"secondary"}
    >
        Import Data
    </Button>
    <Button onclick={exportCloud} variant={"secondary"}>Export Cloud Data</Button>
    <Button href="/reset-password" variant="outline">Change Password</Button>
    {#if hasLegacyData}
        <div class="rounded-xl border p-4 space-y-3">
            <p class="text-sm text-muted-foreground">Previous workout data is still in this browser. It has not been uploaded or deleted. Download a backup for your later migration.</p>
            <Button onclick={exportLegacy} variant="outline">Download Previous Browser Data</Button>
        </div>
    {/if}
</section>

<section>
    <hr />
    {#if error}<p role="alert" class="text-destructive">{error}</p>{/if}
    <Button onclick={signOut} variant="outline" disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</Button>
</section>
