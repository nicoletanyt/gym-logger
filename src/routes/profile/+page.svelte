<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { goto } from "$app/navigation";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
    import { STORAGE_KEYS } from "$lib/constants";

    let exportError = $state("");

    function exportData() {
        exportError = "";
        try {
            const data = Object.fromEntries(
                Object.entries(STORAGE_KEYS).map(([name, key]) => {
                    const value = localStorage.getItem(key);
                    return [name, value === null ? null : JSON.parse(value)];
                }),
            );
            const url = URL.createObjectURL(new Blob(
                [JSON.stringify({ version: "legacy-local", ...data }, null, 2)],
                { type: "application/json" },
            ));
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "gym-logger-local-backup.json";
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            exportError = "Could not export browser data. No data was changed.";
        }
    }
</script>

<header>
    <BackBtn />
    <h1>Profile</h1>
</header>

<section class="space-y-3">
    <Button
        onclick={() => {
            goto("/import");
        }}
        variant={"secondary"}
    >
        Import Data
    </Button>
    <Button onclick={exportData} variant={"secondary"}>Export Data</Button>
    {#if exportError}<p role="alert" class="text-destructive">{exportError}</p>{/if}
</section>

<section>
    <hr />
    <ConfirmDialog
        onconfirm={() => {
            localStorage.clear();
            location.reload();
        }}
    >
        {#snippet trigger()}
            Delete Data
        {/snippet}
    </ConfirmDialog>
</section>
