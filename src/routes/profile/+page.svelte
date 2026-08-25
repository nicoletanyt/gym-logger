<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { goto } from "$app/navigation";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import BackBtn from "$lib/components/BackBtn.svelte";
</script>

<header>
    <BackBtn />
    <h1>Profile</h1>
</header>

<section class="space-y-3">
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
    <Button
        onclick={() => {
            goto("/import");
        }}
        variant={"secondary"}
    >
        Import Data
    </Button>
</section>

