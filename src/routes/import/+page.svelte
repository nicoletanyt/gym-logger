<script lang="ts">
    import BackBtn from "$lib/components/BackBtn.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { cloud } from "$lib/cloud.svelte";
    import { importBackup, parseBackup, MAX_BACKUP_BYTES, type Backup, type ImportResult } from "$lib/backup";
    import { Check, FileJson, Upload } from "@lucide/svelte";

    let fileInput = $state<HTMLInputElement>();
    let filename = $state("");
    let backup = $state<Backup | null>(null);
    let result = $state<ImportResult | null>(null);
    let error = $state("");
    let busy = $state(false);
    let reading = $state(false);
    let showResult = $state(false);
    let selection = 0;

    async function chooseFile(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;
        const current = ++selection;
        filename = file.name; backup = null; result = null; error = "";
        if (file.size > MAX_BACKUP_BYTES) { error = "Choose a backup no larger than 10 MB."; return; }
        reading = true;
        try {
            const parsed = parseBackup(await file.text());
            if (current === selection) backup = parsed;
        } catch (failure) {
            if (current === selection) error = failure instanceof Error ? failure.message : "Could not read this file.";
        } finally { if (current === selection) reading = false; }
    }

    async function handleImport() {
        if (!backup || busy || reading) return;
        busy = true; error = ""; result = null;
        try {
            result = await importBackup(backup);
            backup = null;
            showResult = true;
        } catch (failure) {
            error = failure instanceof Error ? failure.message : "Could not import this backup.";
        } finally { busy = false; }
    }
</script>

<div class="mx-auto w-full max-w-2xl pb-8">
    <header class="mt-4 mb-8">
        <div class="flex items-center gap-4">
            <BackBtn dest="/profile" />
            <h1 class="min-w-0 text-2xl sm:text-3xl">Import Data</h1>
        </div>
        <p class="mt-4 text-sm text-muted-foreground">Upload a cloud backup from this account or a previous browser-data backup. Existing records with matching IDs are skipped, not replaced. Your browser backup is never deleted.</p>
    </header>
    <section class="space-y-4">
        <div class="space-y-2">
            <p class="text-sm font-medium">Backup file</p>
            <Button type="button" variant="outline" class="min-h-11 gap-2" onclick={() => fileInput?.click()} disabled={busy || reading}><Upload aria-hidden="true" /> Upload</Button>
            <input bind:this={fileInput} aria-label="Backup file" type="file" accept=".json,application/json" onchange={chooseFile} disabled={busy || reading} class="sr-only" />
            <p class="text-sm text-muted-foreground">JSON files up to 10 MB. Uploaded image files are not included in backups. Imported historical names may reflect the current exercise and routine names.</p>
        </div>
        {#if reading}<p role="status" class="text-sm text-muted-foreground">Reading backup…</p>{/if}
        {#if backup}
            <div class="rounded-md border bg-card p-4 text-sm" aria-live="polite">
                <p class="flex items-center gap-2 font-medium"><FileJson aria-hidden="true" class="size-4 shrink-0" /><span class="min-w-0 break-all">{filename}</span></p>
                <p class="mt-2 text-muted-foreground">{backup.source === "local" ? "Previous browser-data backup" : "Cloud backup"}</p>
                <p class="mt-1 text-muted-foreground">{backup.exercises.length} exercises · {backup.routines.length} routines · {Object.keys(backup.sessions).length} sessions</p>
                {#if backup.warnings.length}
                    <ul class="mt-3 list-disc space-y-1 pl-4 text-muted-foreground">{#each backup.warnings as warning}<li>{warning}</li>{/each}</ul>
                {/if}
            </div>
        {/if}
        {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
        <Button variant="success" class="min-h-11 w-full gap-2" onclick={handleImport} disabled={!backup || reading || busy || cloud.loading || cloud.saving || cloud.needsReload || !cloud.ready}>
            <Upload aria-hidden="true" /> {busy ? "Importing…" : "Import backup"}
        </Button>
    </section>
</div>

<Dialog.Root bind:open={showResult}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Import complete</Dialog.Title>
            <Dialog.Description>
                {#if result}
                    Added {result.exercises} exercises, {result.routines} routines and {result.sessions} sessions. Skipped {result.skipped} existing records.
                    {#if result.imagesOmitted} {result.imagesOmitted} image references belonged to another account and were omitted.{/if}
                {/if}
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer><Button variant="success" onclick={() => { showResult = false; }}><Check aria-hidden="true" /> Done</Button></Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
