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

export const GIFS: Record<string, string[]> = {
    happy: [
        "https://media3.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3d3R4dWk1ZDk1a3BkbnNyZGs3eTR0dnk2dDgzcTl3MTBidjRrajE3MiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/QaO94TsFEnZauKsboY/giphy.webp",
        "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExamZ2cW8xN25ldGtvbHVkaW5sb3NidGtzY3VlOXRxbDdyNmJyOTRwbCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/fUQ4rhUZJYiQsas6WD/200.webp",
        "https://media3.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emhlOTllbTlrZTc4cThkYTZ1bmwyNWJ6NDk3ejBuamh2OThoZ2E4MiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/i17zHLTMt1SmJMv6Aw/200.webp",
    ],
};

export type Result = { success: true } | { success: false; message: string };

export const DEFAULT_EXERCISE: Exercise = {
    id: uuidv4(),
    name: "Example Exercise",
    sets: 1,
    reps: 1,
    avgDuration: 0,
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

export function formatDuration(seconds: number) {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s`;
    }
    let mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins < 60) return `${mins}m ${secs.toString().padStart(2, "0")}s`;

    const hours = Math.floor(mins / 60);
    mins %= 60;
    return `${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
}
