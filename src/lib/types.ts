export interface Exercise {
    name: string;
    sets: number;
    reps: number;
}

export interface Session {
    duration: number;
    effort: number;
    exercises: Exercise[];
    date: string;
}

export interface Routine {
    id: string;
    name: string;
    exercises: Exercise[];
}
