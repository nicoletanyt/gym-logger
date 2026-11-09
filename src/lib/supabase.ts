import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function supabaseConfig() {
    const url = env.PUBLIC_SUPABASE_URL;
    const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example.");
    return { url, key };
}

// Never use a browser singleton for server-side requests or store a service key.
export function getSupabase() {
    if (!browser) throw new Error("The workout client is browser-only");
    const { url, key } = supabaseConfig();
    return createBrowserClient<Database>(url, key);
}

export async function getAccountClient(userId: string) {
    const { data: { session }, error } = await getSupabase().auth.getSession();
    if (error || !session || session.user.id !== userId) throw new Error("Your sign-in changed. Reload before continuing.");
    const { url, key } = supabaseConfig();
    // Bind this operation to one account's token. A simultaneous sign-out/sign-in
    // must never submit the previous account's draft with a different user's JWT.
    return createClient<Database>(url, key, { accessToken: async () => session.access_token });
}
