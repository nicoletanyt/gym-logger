<script lang="ts">
    import BackBtn from "$lib/components/BackBtn.svelte";
    import Button from "$lib/components/ui/button/button.svelte";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { importText, type ImportResult } from "$lib/importer";

    let text = $state("");
    let result = $state<ImportResult | null>(null);
    let showDialog = $state(false);

    function plural(n: number, word: string): string {
        return `${n} ${word}${n == 1 ? "" : "s"}`;
    }

    function handleImport() {
        if (!text.trim()) {
            alert("Paste some session data first.");
            return;
        }
        try {
            result = importText(text);
            if (result.sessionsAdded === 0) {
                alert(
                    "No sessions were imported. Make sure each session starts with a date like 9/8.",
                );
            } else {
                showDialog = true;
            }
        } catch (err) {
            alert((err as Error).message);
        }
    }
</script>

<div class="h-full flex flex-col">
    <header class="shrink-0">
        <BackBtn />
        <h1>Import Data</h1>
        <p class="text-muted-foreground">Paste your session data in.</p>
        <p class="text-muted-foreground text-sm">
            Format: start each session with a date (day/month), then list one
            exercise per line with values like
            <code class="text-foreground">7kg x10, 3 sets</code> or
            <code class="text-foreground">8.5km/h for 15mins</code>, and end
            with <code class="text-foreground">duration: 43mins</code> (or
            <code class="text-foreground">total:</code>) for the session length.
        </p>
    </header>

    <Textarea
        class="mt-2 flex-1 min-h-0"
        style="field-sizing: fixed"
        bind:value={text}
        placeholder={"e.g.\n9/8 bicep curls machine 7kg x10, 3 sets\nduration: 43mins"}
    />
    <Button variant="success" class="w-full mt-3" onclick={handleImport}>
        Import
    </Button>
</div>

<Dialog.Root bind:open={showDialog}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>
                Exercises and Sessions Imported Successfully!
            </Dialog.Title>
            <Dialog.Description>
                {result
                    ? `${plural(result.exercisesAdded, "exercise")} and ${plural(result.sessionsAdded, "session")} were created.`
                    : ""}
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <Button
                variant="success"
                onclick={() => {
                    showDialog = false;
                }}
            >
                Done
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>