import { v4 as uuidv4 } from "uuid";
import { STORAGE_KEYS, type Result } from "./constants";
import type { Exercise } from "./types";

export interface Session {
    id: string;
    duration: number;
    effort: number;
    exercises: Exercise[];
    routineId: string;
    date: string;
    startTime?: Date;
}

export const DEFAULT_SESSION: Session = {
    id: uuidv4(),
    duration: 30,
    effort: 3,
    exercises: [],
    routineId: "custom",
    date: new Date().toISOString().split("T")[0],
};

class SessionManager {
    sessions = $state<Record<string, Session>>({});

    loadData() {
        this.sessions = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.sessions) ?? "{}",
        );
    }
    updateData() {
        localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(this.sessions));
    }

    addSession(newSession: Session): Result {
        // validation
        if (newSession.exercises.length == 0)
            return { success: false, message: "need to add exercises. no slacking." };

        if (newSession.duration <= 0)
            return {
                success: false,
                message:
                    "duration needs to be > 0 mins. you can't exercise 0 mins sir...",
            };

        this.sessions[newSession.date] = newSession;
        this.updateData();
        return { success: true };
    }

    // for stats
    getCount() {
        return Object.keys(this.sessions).length;
    }
    getTotalDuration() {
        return Object.values(this.sessions).reduce(
            (acc, curr: Session) => acc + curr.duration,
            0,
        );
    }
}

export const sessionManager = new SessionManager();
