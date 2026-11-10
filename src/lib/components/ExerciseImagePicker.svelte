<script lang="ts">
    import ExerciseImage from './ExerciseImage.svelte';
    import { libraryImages, validateImage } from '$lib/exercise-images';

    let { imageLink = $bindable(''), file = $bindable(null) }: { imageLink?: string; file?: File | null } = $props();
    const inputId = $props.id();
    let error = $state('');
    let preview = $state('');
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

<fieldset class="space-y-3 py-3">
    <legend class="font-medium">Exercise image (optional)</legend>
    <ExerciseImage src={preview || imageLink} alt="Selected exercise image" class="h-32 w-full rounded-md" />
    <label class="block text-sm font-medium" for={inputId}>Upload a photo</label>
    <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onchange={chooseFile} class="block w-full text-sm" />
    <p class="text-xs text-muted-foreground">JPEG, PNG, or WebP; up to 5 MB.</p>
    {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
    <p class="text-sm font-medium">Or choose from the library</p>
    <div class="grid grid-cols-3 gap-2">
        {#each libraryImages as image}
            <button type="button" aria-label={image.name} aria-pressed={!file && imageLink === image.path} class="overflow-hidden rounded-md border-2 text-left text-xs {(!file && imageLink === image.path) ? 'border-primary' : 'border-transparent'}" onclick={() => { imageLink = image.path; file = null; error = ''; }}>
                <img src={image.path} alt="" class="h-16 w-full object-cover" />
                <span>{image.name}</span>
            </button>
        {/each}
    </div>
    <button type="button" class="text-sm underline" onclick={() => { imageLink = ''; file = null; error = ''; }}>Remove image</button>
    <p class="text-xs text-muted-foreground">Library image credits are available in <a class="underline" href="/exercise-images/CREDITS.md" target="_blank" rel="noreferrer">image credits</a>.</p>
</fieldset>
