export interface Exercise {
    id: string;
    name: string;
    reps: number;
    sets?: number;
    groupId?: string;
}

export interface Group {
    id: string;
    name: string;
    sets: number;
}

export interface ActiveExercise {
    exercise: Exercise;
    currentSet: number;
    durations: number[];
    prevStart: Date;
}

export interface Routine {
    id: string;
    name: string;
    exercises: Exercise[];
}

// ENUMS
export enum RowType {
    GroupHeading,
    ExerciseItem,
}

export enum InputMode {
    None,
    New,
    EditTable,
    EditRow,
}
