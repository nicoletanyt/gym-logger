<script lang="ts">
    import { page } from "$app/state";
    import { CirclePlay, Dumbbell, House, ListChecks } from "@lucide/svelte";
    interface NavItem {
        icon: any;
        name: string;
        id: string;
    }

    const items: NavItem[] = [
        { icon: House, name: "Home", id: "/" },
        { icon: Dumbbell, name: "Exercises", id: "/exercises" },
        { icon: CirclePlay, name: "Sessions", id: "/sessions" },
        { icon: ListChecks, name: "Routines", id: "/routines" },
    ];

    function isActive(route: string) {
        if (route == "/") return page.url.pathname == "/";
        return page.url.pathname.startsWith(route);
    }
</script>

{#snippet Item(item: NavItem)}
    <a
        class={`flex flex-col items-center gap-2 ${isActive(item.id) ? "text-foreground" : "text-muted-foreground"}`}
        href={item.id}
    >
        <item.icon class="size-5" />
        <p class="text-xs">{item.name}</p>
    </a>
{/snippet}

<div
    class="fixed bottom-0 left-0 right-0 flex justify-between bg-background px-10 py-5"
>
    {#each items as item}
        {@render Item(item)}
    {/each}
</div>
