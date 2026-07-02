import { Dumbbell, Repeat, Timer, SportShoe } from "@lucide/svelte";
import { STORAGE_KEYS } from "./constants";

interface ExerciseMetric {
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

interface ExerciseEntry {
    exerciseId: string;
    metric: ExerciseMetric;
}

// eg weight lifting
interface Weight extends ExerciseMetric {
    type: "weight";
    weight: number;
    reps: number;
}

// eg crunches
interface Reps extends ExerciseMetric {
    type: "reps";
    reps: number;
}

// eg planks
interface Duration extends ExerciseMetric {
    type: "duration";
    duration: number;
}

interface Cardio extends ExerciseMetric {
    type: "cardio";
    duration: number;
    distance: number;
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

    getById(id: string): Exercise {
        return this.exercises.find((e) => e.id == id)!;
    }
    addExercise() { }
}

export const exerciseManager = new ExerciseManager();
