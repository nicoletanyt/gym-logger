import { Dumbbell, Repeat, Timer, SportShoe } from "@lucide/svelte";
import { STORAGE_KEYS } from "./constants";
import { v4 as uuidv4 } from "uuid";

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
    metricType: MetricType;
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
    exerciseId: string;
    metric: ExerciseMetric;
}

class ExerciseManager {
    exercises = $state<Exercise[]>([]);

    loadData() {
        this.exercises = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.exercises) ?? "[]",
        );
    }
    updateData() {
        localStorage.setItem(
            STORAGE_KEYS.exercises,
            JSON.stringify(this.exercises),
        );
    }

    createDefaultExercise(): Exercise {
        return {
            id: uuidv4(),
            name: "",
            imageLink: "",
            metricType: "weight",
        };
    }

    createExerciseEntry(
        exerciseId: string,
        metric: ExerciseMetric,
    ): ExerciseEntry {
        // TODO: validation
        return {
            exerciseId: exerciseId,
            metric: metric,
        };
    }

    getById(id: string): Exercise {
        return this.exercises.find((e) => e.id == id)!;
    }
    addExercise(newExercise: Exercise) {
        // TODO: validation (for img)
        this.exercises.push(newExercise);
    }
}

export const exerciseManager = new ExerciseManager();
