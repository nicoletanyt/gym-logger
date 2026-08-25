import { v4 as uuidv4 } from "uuid";
import { STORAGE_KEYS, type Result } from "./constants";
import { routineManager } from "./Routine.svelte";
import type { ExerciseEntry } from "./Exercise.svelte";

export interface Session {
    id: string;
    duration: number;
    exercises: ExerciseEntry[];
    routineId: string;
    date: string;
    startTime?: Date;
}

export const DEFAULT_SESSION: Session = {
    id: uuidv4(),
    duration: 0,
    exercises: [],
    routineId: "custom",
    date: new Date().toISOString().split("T")[0],
};

class SessionManager {
    sessions = $state<Record<string, Session>>({});
    activeSession = $state<Session>(DEFAULT_SESSION);

    loadData() {
        this.sessions = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.sessions) ?? "{}",
        );
    }
    updateData() {
        localStorage.setItem(
            STORAGE_KEYS.sessions,
            JSON.stringify(this.sessions),
        );
    }

    addSession(newSession: Session): Result {
        // validation
        if (newSession.exercises.length == 0)
            return {
                success: false,
                message: "need to add exercises. no slacking.",
            };

        if (newSession.duration <= 0)
            return {
                success: false,
                message: "duration needs to be > 0 mins...",
            };

        // format duration to minutes
        newSession.duration *= 60;
        this.sessions[newSession.date] = newSession;
        this.updateData();
        return { success: true };
    }
    addActiveSession() {
        const result = this.addSession(this.activeSession);
        this.activeSession = DEFAULT_SESSION;
        return result;
    }

    applyRoutine(session: Session): Session {
        if (session.routineId != "custom") {
            const routine = routineManager.getById(session.routineId);
            session.exercises = [...routine.exercises];
        } else {
            session.exercises = [];
        }
        return session;
    }

    removeExerciseEntries(exerciseIds: string[]) {
        for (const session of Object.values(this.sessions)) {
            session.exercises = session.exercises.filter(
                (e) => !exerciseIds.includes(e.exerciseId),
            );
        }
        this.activeSession.exercises = this.activeSession.exercises.filter(
            (e) => !exerciseIds.includes(e.exerciseId),
        );
        this.updateData();
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

    // for summary
    getSetCount() {
        return this.activeSession.exercises.reduce(
            (acc, curr) => acc + (curr.metric.sets ?? 0),
            0,
        );
    }
    getExerciseCount() {
        return this.activeSession.exercises.length;
    }

    // for homepage stats
    calculateStreak(): number {
        const sessions = Object.values(this.sessions).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        if (sessions.length === 0) return 0;

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        const sessionDates = new Set<string>(
            sessions.map((s) => new Date(s.date).toDateString()),
        );

        let streak = 0;
        let checkDate = new Date(todayDate);

        while (sessionDates.has(checkDate.toDateString())) {
            streak++;
            checkDate = new Date(checkDate);
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    }
    calculateWorkoutsThisWeek(): number {
        const now = new Date();
        const startOfWeek = new Date(
            now.setDate(now.getDate() - now.getDay() + 1),
        );
        startOfWeek.setHours(0, 0, 0, 0);

        let count = 0;
        Object.values(this.sessions).forEach((session) => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);
            if (sessionDate >= startOfWeek) {
                count++;
            }
        });
        return count;
    }

    // for calendar
    getMaxDuration(): number {
        const durations = Object.values(this.sessions).map((s) => s.duration);
        return durations.length > 0 ? Math.max(...durations) : 0;
    }
    getMinDuration(): number {
        const durations = Object.values(this.sessions).map((s) => s.duration);
        return durations.length > 0 ? Math.min(...durations) : 0;
    }
    getLevel(date: number): number {
        const duration =
            sessionManager.sessions[date.toString()]?.duration ?? 0;
        if (duration == 0) return 0;

        const minDuration = this.getMinDuration();
        const maxDuration = this.getMaxDuration();

        const interval = (maxDuration - minDuration) / 4;
        const level = Math.round((duration - minDuration) / interval) + 1;
        return Math.max(1, Math.min(4, level));
    }
}

export const sessionManager = new SessionManager();
