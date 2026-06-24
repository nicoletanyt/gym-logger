export interface Exercise {
    name: string;
    sets: number;
    reps: number;
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
