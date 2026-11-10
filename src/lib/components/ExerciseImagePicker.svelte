<script lang="ts">
    import ExerciseImage from './ExerciseImage.svelte';
    import { libraryImages, validateImage } from '$lib/exercise-images';
    import { Image as ImageIcon, Trash2, Upload } from '@lucide/svelte';
    import Button from './ui/button/button.svelte';
    import * as Dialog from './ui/dialog/index.js';
    import ErrorAlert from './ErrorAlert.svelte';

    let { imageLink = $bindable(''), file = $bindable(null) }: { imageLink?: string; file?: File | null } = $props();
    const inputId = $props.id();
    let error = $state('');
    let preview = $state('');
    let libraryOpen = $state(false);
    let fileInput = $state<HTMLInputElement>();
    $effect(() => {
        if (!file) { preview = ''; return; }
        const url = URL.createObjectURL(file);
        preview = url;
        return () => URL.revokeObjectURL(url);
    });
    function chooseFile(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const selected = input.files?.[0];
        input.value = '';
        if (!selected) return;
        const invalid = validateImage(selected);
        if (invalid) { error = invalid; return; }
        error = '';
        file = selected;
        imageLink = '';
    }
</script>

<fieldset class="space-y-3">
    <legend class="mb-3 text-sm font-medium">Exercise image <span class="font-normal text-muted-foreground">(optional)</span></legend>
    <div class="flex items-stretch gap-3">
        <ExerciseImage src={preview || imageLink} alt="Selected exercise image" class="h-32 min-w-0 flex-1 rounded-md" />
        <div class="flex shrink-0 flex-col items-stretch gap-2">
            <Button variant="outline" class="justify-start" onclick={() => fileInput?.click()}><Upload /> Upload</Button>
            <Button variant="outline" class="justify-start" onclick={() => (libraryOpen = true)}><ImageIcon /> Choose from library</Button>
            {#if file || imageLink}
                <Button variant="destructive" class="justify-start" onclick={() => { imageLink = ''; file = null; error = ''; }}><Trash2 /> Remove image</Button>
            {/if}
        </div>
    </div>
    <input bind:this={fileInput} id={inputId} aria-label="Upload a photo" type="file" accept="image/jpeg,image/png,image/webp" onchange={chooseFile} class="sr-only" />
    {#if error}<ErrorAlert message={error} ondismiss={() => (error = '')} />{/if}
</fieldset>

<Dialog.Root bind:open={libraryOpen}>
    <Dialog.Content class="max-h-[85dvh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>Choose an exercise image</Dialog.Title>
            <Dialog.Description>Select an image from the library.</Dialog.Description>
        </Dialog.Header>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {#each libraryImages as image}
                <button type="button" aria-label={image.name} aria-pressed={!file && imageLink === image.path} class="overflow-hidden rounded-md border-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 {(!file && imageLink === image.path) ? 'border-primary' : 'border-transparent'}" onclick={() => { imageLink = image.path; file = null; error = ''; libraryOpen = false; }}>
                    <img src={image.path} alt="" class="h-24 w-full object-cover" />
                    <span class="block px-1 py-2">{image.name}</span>
                </button>
            {/each}
        </div>
        <p class="text-xs text-muted-foreground">Library image credits are available in <a class="underline" href="/exercise-images/CREDITS.md" target="_blank" rel="noreferrer">image credits</a>.</p>
    </Dialog.Content>
</Dialog.Root>
