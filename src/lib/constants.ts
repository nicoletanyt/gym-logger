import type { Exercise, Group } from "./types";
import { v4 as uuidv4 } from "uuid";

export const STORAGE_KEYS: Record<string, string> = {
    sessions: "SESSIONS_STORED",
    routines: "ROUTINES_STORED",
};

export const INTENSITY_MAP: Record<number, string> = {
    0: "bg-transparent",
    1: "bg-green-500/20",
    2: "bg-green-500/40",
    3: "bg-green-500/60",
    4: "bg-green-500/80",
};

export type Result = { success: true } | { success: false; message: string };

export const DEFAULT_EXERCISE: Exercise = {
    id: uuidv4(),
    name: "Example Exercise",
    sets: 1,
    reps: 1,
};

export const DEFAULT_GROUP: Group = {
    id: "",
    name: "New Group",
    sets: 1,
};

export function getLevel(effort: number): number {
    // maps the range from 1-4
    return Math.round((effort / 5) * 4);
}
