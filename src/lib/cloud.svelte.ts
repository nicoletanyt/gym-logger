import { browser } from "$app/environment";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Exercise } from "./Exercise.svelte";
import type { Routine } from "./Routine.svelte";
import type { Session } from "./Session.svelte";
import type { Result } from "./constants";
import { getAccountClient } from "./supabase";
import { fetchWorkouts } from "./workout-repository";

const empty = () => ({ exercises: [] as Exercise[], routines: [] as Routine[], sessions: {} as Record<string, Session> });
export const WORKOUT_LOAD_TIMEOUT_MS = 20_000;
export function cloudError(error: unknown): string {
    const value = error as { code?: string; message?: string };
    if (value?.code === "PT409") return "This record changed elsewhere or was deleted. Your draft was not saved. Reload before editing again.";
    if (/fetch|network|timeout|aborted/i.test(value?.message ?? "")) return "The connection was interrupted. A save may have completed; reload the latest data before submitting it again.";
    return value?.message || "Could not reach Supabase. Check your connection and try again.";
}

class Cloud {
    data = $state(empty());
    ownerId = $state<string | null>(null);
    loading = $state(false);
    ready = $state(false);
    saving = $state(false);
    needsReload = $state(false);
    error = $state("");
    private generation = 0;
    private readController: AbortController | null = null;

    clear() {
        this.generation++;
        this.readController?.abort();
        this.readController = null;
        this.ownerId = null;
        this.data = empty();
        this.ready = false;
        this.loading = false;
        this.saving = false;
        this.needsReload = false;
        this.error = "";
    }
    async setUser(id: string | null) {
        if (!browser) return;
        if (id === this.ownerId) {
            // Reconciliation may return the same user without changing layout
            // props. Recover an uninitialized/failed load, but do not reset loaded
            // data or duplicate an in-flight request on repeated SIGNED_IN events.
            if (id && !this.ready && !this.loading) await this.reload();
            return;
        }
        this.clear();
        this.ownerId = id;
        if (id) await this.reload();
    }

    private async readWorkouts(id: string) {
        const controller = new AbortController();
        this.readController = controller;
        let rejectAborted!: () => void;
        const aborted = new Promise<never>((_, reject) => {
            rejectAborted = () => reject(controller.signal.reason);
            controller.signal.addEventListener("abort", rejectAborted, { once: true });
        });
        const timeout = setTimeout(() => controller.abort(new Error("Workout loading timed out. Check your connection and retry.")), WORKOUT_LOAD_TIMEOUT_MS);
        try {
            // Bound session lookup as well as the fetches: a stalled Auth lock
            // must not leave loading=true forever. Late completions cannot commit
            // state; aborted fetches also stop PostgREST's automatic retries.
            return await Promise.race([
                (async () => {
                    const client = await getAccountClient(id);
                    controller.signal.throwIfAborted();
                    return fetchWorkouts(client, id, controller.signal);
                })(),
                aborted,
            ]);
        } finally {
            clearTimeout(timeout);
            controller.signal.removeEventListener("abort", rejectAborted);
            controller.abort();
            if (this.readController === controller) this.readController = null;
        }
    }

    async reload() {
        if (!this.ownerId || this.saving || this.loading) return;
        const id = this.ownerId, generation = this.generation;
        this.loading = true;
        this.error = "";
        try {
            const data = await this.readWorkouts(id);
            if (generation !== this.generation) return;
            this.data = data;
            this.ready = true;
            this.needsReload = false;
        } catch (error) {
            if (generation === this.generation) this.error = cloudError(error);
        } finally {
            if (generation === this.generation) this.loading = false;
        }
    }
    async mutate(operation: (client: SupabaseClient<Database>) => Promise<void>): Promise<Result> {
        if (!this.ownerId || !this.ready || this.needsReload) return { success: false, message: "Sign in and load your workouts before saving." };
        if (this.saving || this.loading) return { success: false, message: "Please wait for the current save or refresh to finish." };
        const generation = this.generation, id = this.ownerId;
        this.saving = true;
        this.error = "";
        let committed = false;
        try {
            const client = await getAccountClient(id);
            if (generation !== this.generation) return { success: false, message: "Your account changed. Reload before continuing." };
            await operation(client);
            committed = true;
            if (generation !== this.generation) return { success: false, message: "Your account changed. Reload before continuing." };
            const data = await this.readWorkouts(id);
            if (generation !== this.generation) return { success: false, message: "Your account changed. Reload before continuing." };
            this.data = data;
            return { success: true };
        } catch (error) {
            if (generation !== this.generation) return { success: false, message: "Your account changed. Reload before continuing." };
            if (committed) {
                this.needsReload = true;
                this.error = "Your change was saved, but the updated data could not be loaded. Retry loading; do not submit it again.";
                return { success: true };
            }
            this.error = cloudError(error);
            return { success: false, message: this.error };
        } finally {
            if (generation === this.generation) this.saving = false;
        }
    }
}

// Only populated on the browser. Never hydrate this module-global store in SSR.
export const cloud = new Cloud();
