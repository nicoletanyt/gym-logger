import type { Session, Exercise, Routine } from "./types";

export const INTENSITY_MAP: Record<number, string> = {
    0: "bg-transparent",
    1: "bg-green-200!",
    2: "bg-green-300!",
    3: "bg-green-500!",
    4: "bg-green-700!",
};

// log
export const DEFAULT_SESSION: Session = {
    duration: 20,
    effort: 3,
    exercises: [],
    templateId: "custom",
    date: new Date().toISOString().split("T")[0],
};

export const DEFAULT_EXERCISE: Exercise = {
    name: "Example Exercise",
    sets: 0,
    reps: 0,
};

export const DEFAULT_ROUTINE: Routine = {
    id: crypto.randomUUID(),
    name: "New Routine",
    exercises: [],
};
