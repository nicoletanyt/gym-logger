export interface Exercise {
    id: string;
    name: string;
    sets: number;
    reps: number;
    groupId?: string;
}

export interface Group {
    id: string;
    name: string;
}

export interface ActiveExercise {
    exercise: Exercise;
    currentSet: number;
    startTimes: Date[];
    endTimes: Date[];
}

export interface Session {
    duration: number;
    effort: number;
    exercises: Exercise[];
    templateId: string;
    date: string;
    startTime?: Date;
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
