<script lang="ts">
    import { cloud } from '$lib/cloud.svelte';
    import { getAccountClient } from '$lib/supabase';
    import { IMAGE_BUCKET, STORAGE_PREFIX } from '$lib/exercise-images';
    import { Dumbbell } from '@lucide/svelte';

    let { src = '', alt = '', class: className = '' }: { src?: string; alt?: string; class?: string } = $props();
    let url = $state('');
    let failed = $state(false);

    $effect(() => {
        const image = src, owner = cloud.ownerId;
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        url = '';
        failed = false;
        async function resolve() {
            if (!image.startsWith(STORAGE_PREFIX)) { url = image; return; }
            if (!owner || !image.slice(STORAGE_PREFIX.length).startsWith(`${owner}/`)) return;
            try {
                const client = await getAccountClient(owner);
                const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(image.slice(STORAGE_PREFIX.length), 3600);
                if (error) throw error;
                if (active) { url = data.signedUrl; timer = setTimeout(resolve, 50 * 60 * 1000); }
            } catch { if (active) failed = true; }
        }
        void resolve();
        return () => { active = false; clearTimeout(timer); };
    });
</script>

{#if url && !failed}
    <img src={url} {alt} class="object-cover {className}" onerror={() => failed = true} />
{:else}
    <div class="flex items-center justify-center bg-muted text-muted-foreground {className}" role="img" aria-label={alt || 'No exercise image'}><Dumbbell /></div>
{/if}
