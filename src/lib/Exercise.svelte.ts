import { Dumbbell, Repeat, Timer, SportShoe } from "@lucide/svelte";
import { type Result } from "./constants";
import { v4 as uuidv4 } from "uuid";
import { cloud } from "./cloud.svelte";
import { saveExercise } from "./workout-repository";

export interface BaseMetric {
    sets: number;
}

export interface MetricDetails {
    name: string;
    icon: any;
    colour: string;
}

export type MetricType = "weight" | "reps" | "duration" | "cardio";
export const METRICS = {
    weight: {
        name: "Weight",
        icon: Dumbbell,
        colour: "bg-blue-200",
    },
    reps: {
        name: "Reps",
        icon: Repeat,
        colour: "bg-yellow-200",
    },
    duration: {
        name: "Duration",
        icon: Timer,
        colour: "bg-pink-200",
    },
    cardio: {
        name: "Cardio",
        icon: SportShoe,
        colour: "bg-green-200",
    },
} satisfies Record<MetricType, MetricDetails>;

export interface Exercise {
    id: string;
    name: string;
    imageLink?: string; // TODO:
    note?: string;
    metricType: MetricType;
    archived?: boolean;
    revision?: number;
}

// eg weight lifting
export interface Weight extends BaseMetric {
    type: "weight";
    weight: number;
    reps: number;
}

// eg crunches
export interface Reps extends BaseMetric {
    type: "reps";
    reps: number;
}

// eg planks
export interface Duration extends BaseMetric {
    type: "duration";
    duration: number;
}

export interface Cardio extends BaseMetric {
    type: "cardio";
    duration: number;
    distance: number;
}

export type ExerciseMetric = Weight | Reps | Duration | Cardio;

export interface ExerciseEntry {
    id: string;
    exerciseId: string;
    metric: ExerciseMetric;
    avgDuration?: number;
    exerciseName?: string;
}

export const UNITS = {
    sets: "sets",
    reps: "reps",
    weight: "kg",
    duration: "mins",
    distance: "km",
};

class ExerciseManager {
    get exercises() { return cloud.data.exercises.filter((exercise) => !exercise.archived); }
    get archivedExercises() { return cloud.data.exercises.filter((exercise) => exercise.archived); }

    createDefaultExercise(): Exercise {
        return {
            id: uuidv4(),
            name: "",
            imageLink: "",
            note: "",
            metricType: "weight",
        };
    }

    validateEntry(exerciseId: string, metric: ExerciseMetric): Result {
        if (!exerciseId)
            return { success: false, message: "Exercise is compulsory" };
        if (!Number.isInteger(metric.sets) || metric.sets <= 0)
            return { success: false, message: "Sets cannot be <= 0" };

        if ("weight" in metric && (!Number.isFinite(metric.weight) || metric.weight <= 0))
            return { success: false, message: "Weight cannot be <= 0" };
        if ("reps" in metric && (!Number.isInteger(metric.reps) || metric.reps <= 0))
            return { success: false, message: "Reps cannot be <= 0" };
        if ("duration" in metric && (!Number.isFinite(metric.duration) || metric.duration <= 0))
            return { success: false, message: "Duration cannot be <= 0" };
        if ("distance" in metric && (!Number.isFinite(metric.distance) || metric.distance <= 0))
            return { success: false, message: "Distance cannot be <= 0" };

        return { success: true };
    }

    createEntry(exerciseId: string, metric: ExerciseMetric): { success: true; data: ExerciseEntry } | { success: false; message: string } {
        const result = this.validateEntry(exerciseId, metric);
        if (!result.success) return result;

        return {
            success: true,
            data: {
                id: uuidv4(),
                exerciseId: exerciseId,
                metric: { ...metric },
            },
        };
    }
    getById(id: string): Exercise | undefined {
        return cloud.data.exercises.find((e) => e.id == id);
    }
    async addExercise(newExercise: Exercise): Promise<Result> {
        if (!newExercise.name.trim()) return { success: false, message: "Exercise name is required." };
        const value = $state.snapshot(newExercise);
        return cloud.mutate((client) => saveExercise(client, value, true));
    }
    async removeExercises(ids: string[]): Promise<Result> {
        return cloud.mutate(async (client) => {
            const { error } = await client.rpc("archive_exercises", { p_ids: [...ids] });
            if (error) throw error;
        });
    }
    async updateExercise(updated: Exercise): Promise<Result> {
        const value = $state.snapshot(updated);
        return cloud.mutate((client) => saveExercise(client, value));
    }
}

export const exerciseManager = new ExerciseManager();
