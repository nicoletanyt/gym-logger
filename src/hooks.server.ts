import { createServerClient } from "@supabase/ssr";
import { redirect, type Handle } from "@sveltejs/kit";
import { supabaseConfig } from "$lib/supabase";
import type { Database } from "$lib/database.types";

export const handle: Handle = async ({ event, resolve }) => {
    const { url, key } = supabaseConfig();
    // Apply even to redirects and Auth callback responses which set cookies.
    event.setHeaders({ "cache-control": "private, no-cache, no-store, must-revalidate, max-age=0", expires: "0", pragma: "no-cache" });
    event.locals.supabase = createServerClient<Database>(url, key, {
        cookies: {
            getAll: () => event.cookies.getAll(),
            setAll: (cookies) => {
                for (const { name, value, options } of cookies) event.cookies.set(name, value, { ...options, path: "/" });
            },
        },
    });
    // Avoid an Auth request when there is no cookie session, but never trust an
    // unvalidated session to authorize a request.
    const { data: { session } } = await event.locals.supabase.auth.getSession();
    event.locals.user = null;
    if (session) {
        const { data, error } = await event.locals.supabase.auth.getUser();
        if (!error) event.locals.user = data.user;
    }
    const path = event.url.pathname;
    const publicRoute = path === "/sign-in" || path.startsWith("/auth/");
    if (event.route.id && !publicRoute && !event.locals.user) {
        redirect(303, `/sign-in?next=${encodeURIComponent(path + event.url.search)}`);
    }
    const response = await resolve(event, {
        filterSerializedResponseHeaders: (name) => name === "content-range" || name === "x-supabase-api-version",
    });
    return response;
};
