import { v4 as uuidv4 } from "uuid";
import { type Result } from "./constants";
import type { ExerciseEntry } from "./Exercise.svelte";
import { cloud } from "./cloud.svelte";
import { saveRoutine } from "./workout-repository";

export interface Routine {
    id: string;
    name: string;
    exercises: ExerciseEntry[];
    revision?: number;
}

class RoutineManager {
    get routines() { return cloud.data.routines; }
    options = $derived([
        { value: "custom", label: "Custom" },
        ...this.routines.map((r) => ({
            value: r.id,
            label: r.name,
        })),
    ]);

    getById(id: string): Routine | undefined {
        return this.routines.find((r) => r.id == id);
    }

    createDefault() {
        return {
            id: uuidv4(),
            name: "New Routine",
            exercises: [],
        };
    }

    // TODO:
    getTotalSessions() { }

    async addRoutine(newRoutine: Routine): Promise<Result> {
        if (newRoutine.exercises.length == 0)
            return { success: false, message: "need to add exercises. no slacking." };

        const value = $state.snapshot(newRoutine);
        return cloud.mutate((client) => saveRoutine(client, value, true));
    }
    async deleteRoutine(id: string, revision: number | undefined): Promise<Result> {
        if (!revision) return { success: false, message: "Reload this routine before deleting." };
        return cloud.mutate(async (client) => {
            const { error } = await client.rpc("delete_routine", { p_id: id, p_expected_revision: revision });
            if (error) throw error;
        });
    }
    async updateRoutine(newRoutine: Routine): Promise<Result> {
        const value = $state.snapshot(newRoutine);
        return cloud.mutate((client) => saveRoutine(client, value));
    }
}

export const routineManager = new RoutineManager();
