import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, depends }) => {
    depends("supabase:auth");
    // Do not serialize refresh/access tokens into page data.
    return { user: locals.user ? { id: locals.user.id, email: locals.user.email } : null };
};
