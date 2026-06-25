import type { Session, Exercise, Routine } from "./types";
import { v4 as uuidv4 } from "uuid";

export const INTENSITY_MAP: Record<number, string> = {
    0: "bg-transparent",
    1: "bg-green-500/20",
    2: "bg-green-500/40",
    3: "bg-green-500/60",
    4: "bg-green-500/80",
    // 0: "bg-transparent",
    // 1: "bg-green-200!",
    // 2: "bg-green-300!",
    // 3: "bg-green-500!",
    // 4: "bg-green-700!",
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
    id: uuidv4(),
    name: "Example Exercise",
    sets: 0,
    reps: 0,
};

export const DEFAULT_ROUTINE: Routine = {
    id: uuidv4(),
    name: "New Routine",
    exercises: [],
};

export function getLevel(effort: number): number {
    // maps the range from 1-4
    return Math.round((effort / 5) * 4);
}
