import type { ExerciseEntry } from "./Exercise.svelte";

export interface Group {
    id: string;
    name: string;
    sets: number;
}

export interface ActiveExercise {
    exercise: ExerciseEntry;
    currentSet: number;
    durations: number[];
    prevStart: Date;
}

// ENUMS
export enum RowType {
    GroupHeading,
    ExerciseItem,
}

export enum InputMode {
    None,
    Add,
    New,
}
