import { v4 as uuidv4 } from "uuid";
import { STORAGE_KEYS, type Result } from "./constants";
import type { ExerciseEntry } from "./Exercise.svelte";

export interface Routine {
    id: string;
    name: string;
    exercises: ExerciseEntry[];
}

class RoutineManager {
    routines = $state<Routine[]>([]);
    options = $derived([
        { value: "custom", label: "Custom" },
        ...this.routines.map((r) => ({
            value: r.id,
            label: r.name,
        })),
    ]);

    loadData() {
        this.routines = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.routines) ?? "[]",
        );
    }
    updateData() {
        localStorage.setItem(STORAGE_KEYS.routines, JSON.stringify(this.routines));
    }

    getById(id: string): Routine {
        return this.routines.find((r) => r.id == id)!;
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

    addRoutine(newRoutine: Routine): Result {
        if (newRoutine.exercises.length == 0)
            return { success: false, message: "need to add exercises. no slacking." };

        this.routines.push({ ...newRoutine });
        this.updateData();
        return { success: true };
    }
    deleteRoutine(id: string) {
        this.routines = this.routines.filter((r) => r.id != id);
        this.updateData();
    }
    removeExerciseEntries(exerciseIds: string[]) {
        for (const routine of this.routines) {
            routine.exercises = routine.exercises.filter(
                (e) => !exerciseIds.includes(e.exerciseId),
            );
        }
        this.updateData();
    }
    updateRoutine(newRoutine: Routine) {
        this.deleteRoutine(newRoutine.id);
        this.addRoutine(newRoutine);
        this.updateData();
    }
}

export const routineManager = new RoutineManager();
