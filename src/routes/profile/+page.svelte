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
    import { Check, ChevronDown, Download, KeyRound, LogOut, Mail, Monitor, Moon, Sun, Upload } from "@lucide/svelte";
    import { Select } from "bits-ui";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import FieldIcon from "$lib/components/FieldIcon.svelte";
    import { createCloudBackup, createLocalBackup, downloadBackup } from "$lib/backup";

    let signingOut = $state(false);
    let error = $state("");
    let exportError = $state("");
    let hasLegacyData = $state(false);
    let appearance = $state<ThemePreference>("system");
    const appearanceOptions = [{ value: "system", label: "System", icon: Monitor }, { value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }] as const;
    const selectedAppearance = $derived(appearanceOptions.find((option) => option.value === appearance) ?? appearanceOptions[0]);
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
    function exportCloud() {
        exportError = "";
        if (!cloud.ready || cloud.loading || cloud.saving || cloud.needsReload) { exportError = "Load the latest cloud data before exporting."; return; }
        try { downloadBackup(createCloudBackup($state.snapshot(cloud.data)), "gym-logger-backup.json"); }
        catch { exportError = "Could not export cloud data. No data was changed."; }
    }
    function exportLegacy() {
        exportError = "";
        try {
            downloadBackup(createLocalBackup(localStorage), "gym-logger-local-backup.json");
        } catch { exportError = "Could not read the existing browser backup. No data was changed."; }
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

<div class="mx-auto w-full max-w-2xl pb-8">
<header class="mt-4 mb-8">
    <div class="flex items-center gap-4">
        <BackBtn />
        <h1 class="min-w-0 text-2xl sm:text-3xl">Profile</h1>
    </div>
    <div class="mt-4 max-w-md space-y-2">
        <Label for="profile-email">Email</Label>
        <FieldIcon icon={Mail}>
            <Input id="profile-email" type="email" value={page.data.user?.email ?? ""} readonly aria-readonly="true" class="h-11 pl-10" />
        </FieldIcon>
    </div>
</header>

<section class="my-8 max-w-md space-y-2">
    <Label for="profile-appearance">Appearance</Label>
    <Select.Root type="single" value={appearance} items={appearanceOptions.map(({ value, label }) => ({ value, label }))} onValueChange={(value) => { if (value === "system" || value === "light" || value === "dark") { appearance = value; setThemePreference(value); } }}>
        <Select.Trigger id="profile-appearance" class="flex h-11 w-full items-center gap-3 rounded-md border border-input bg-field px-3 text-left text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm">
            <selectedAppearance.icon aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
            <span class="flex-1">{selectedAppearance.label}</span>
            <ChevronDown aria-hidden="true" class="size-4 text-muted-foreground" />
        </Select.Trigger>
        <Select.Portal>
            <Select.Content class="z-50 w-[var(--bits-select-anchor-width)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md" sideOffset={4}>
                {#each appearanceOptions as option}
                    <Select.Item value={option.value} label={option.label} class="flex min-h-10 cursor-pointer items-center gap-3 rounded-sm px-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground">
                        <option.icon aria-hidden="true" class="size-4 text-muted-foreground" />
                        <span class="flex-1">{option.label}</span>
                        {#if appearance === option.value}<Check aria-hidden="true" class="size-4" />{/if}
                    </Select.Item>
                {/each}
            </Select.Content>
        </Select.Portal>
    </Select.Root>
</section>

<section class="my-8 gap-3 space-y-0">
    <h2>Data</h2>
    <Button
        onclick={() => {
            goto("/import");
        }}
        variant={"secondary"}
        class="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left"
    >
        <Upload aria-hidden="true" />
        Import Data
    </Button>
    <Button onclick={exportCloud} disabled={!cloud.ready || cloud.loading || cloud.saving || cloud.needsReload} variant="secondary" class="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left"><Download aria-hidden="true" /> Export Cloud Data</Button>
    {#if hasLegacyData}
        <div class="rounded-xl border p-4 space-y-3">
            <p class="text-sm text-muted-foreground">Previous workout data is still in this browser. It has not been uploaded or deleted. Download a backup for your later migration.</p>
            <Button onclick={exportLegacy} variant="outline" class="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left"><Download aria-hidden="true" /> Download Previous Browser Data</Button>
        </div>
    {/if}
    {#if exportError}<p role="alert" class="text-sm text-destructive">{exportError}</p>{/if}
</section>

<section class="my-8 gap-3 space-y-0">
    <h2>Security</h2>
    <Button href="/reset-password" variant="outline" class="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left"><KeyRound aria-hidden="true" /> Change Password</Button>
    {#if error}<p role="alert" class="text-destructive">{error}</p>{/if}
    <Button onclick={signOut} variant="destructive" class="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left" disabled={signingOut}><LogOut aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}</Button>
</section>
</div>
