import { v4 as uuidv4 } from "uuid";
import { STORAGE_KEYS, type Result } from "./constants";
import { routineManager } from "./Routine.svelte";
import {
    exerciseManager,
    type ExerciseEntry,
    type ExerciseMetric,
} from "./Exercise.svelte";

export interface Session {
    id: string;
    duration: number;
    exercises: ExerciseEntry[];
    routineId: string;
    date: string;
    startTime?: Date;
    createdAt?: string;
    effort?: number;
}

export function createDefaultSession(): Session {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return { id: uuidv4(), duration: 0, exercises: [], routineId: "custom", date, createdAt: now.toISOString() };
}

class SessionManager {
    sessions = $state<Record<string, Session>>({}); // session ID: session
    activeSession = $state<Session>(createDefaultSession());

    loadData() {
        const stored: Record<string, Session> = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.sessions) ?? "{}",
        );
        // Older versions keyed sessions by date. Keep the original local data
        // untouched until the next explicit save.
        this.sessions = Object.fromEntries(Object.values(stored).map((session) => [session.id, session]));
    }
    updateData() {
        localStorage.setItem(
            STORAGE_KEYS.sessions,
            JSON.stringify(this.sessions),
        );
    }
    getLatestExercise(exerciseId: string): ExerciseMetric {
        const latestSession = Object.values(this.sessions)
            .filter((session) =>
                session.exercises.some(
                    (exercise) => exercise.exerciseId == exerciseId,
                ),
            )
            .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];

        if (latestSession === undefined) {
            const exercise = exerciseManager.getById(exerciseId);

            switch (exercise.metricType) {
                case "reps":
                    return {
                        sets: 0,
                        type: "reps",
                        reps: 0,
                    };

                case "weight":
                    return {
                        sets: 0,
                        type: "weight",
                        weight: 0,
                        reps: 0,
                    };

                case "duration":
                    return {
                        sets: 0,
                        type: "duration",
                        duration: 0,
                    };

                case "cardio":
                    return {
                        sets: 0,
                        type: "cardio",
                        duration: 0,
                        distance: 0,
                    };
            }
        }
        return latestSession.exercises.find((e) => e.exerciseId == exerciseId)!
            .metric;
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

        this.sessions[newSession.id] = { ...newSession, createdAt: newSession.createdAt ?? new Date().toISOString() };
        this.updateData();
        return { success: true };
    }
    addActiveSession() {
        const result = this.addSession(this.activeSession);
        if (result.success) this.activeSession = createDefaultSession();
        return result;
    }

    applyRoutine(session: Session): Session {
        if (session.routineId != "custom") {
            const routine = routineManager.getById(session.routineId);
            session.exercises = routine.exercises.map((entry) => ({
                ...entry,
                metric: { ...this.getLatestExercise(entry.exerciseId) },
            }));
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

    deleteSession(id: string) {
        delete this.sessions[id];
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

        const sessionDates = new Set(sessions.map((s) => s.date));

        let streak = 0;
        let checkDate = new Date(todayDate);

        const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        while (sessionDates.has(localDate(checkDate))) {
            streak++;
            checkDate = new Date(checkDate);
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    }
    calculateWorkoutsThisWeek(): number {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        startOfWeek.setHours(0, 0, 0, 0);

        let count = 0;
        Object.values(this.sessions).forEach((session) => {
            const sessionDate = new Date(`${session.date}T00:00:00`);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            if (sessionDate >= startOfWeek && sessionDate < endOfWeek) {
                count++;
            }
        });
        return count;
    }

    // for calendar
    getMaxDuration(): number {
        const durations = this.getDailyDurations();
        return durations.length > 0 ? Math.max(...durations) : 0;
    }
    getMinDuration(): number {
        const durations = this.getDailyDurations();
        return durations.length > 0 ? Math.min(...durations) : 0;
    }
    getSessionsForDate(date: string): Session[] {
        return Object.values(this.sessions).filter((s) => s.date === date)
            .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    }
    getDailyDurations(): number[] {
        const totals = new Map<string, number>();
        for (const session of Object.values(this.sessions)) {
            totals.set(session.date, (totals.get(session.date) ?? 0) + session.duration);
        }
        return [...totals.values()];
    }
    getLevel(date: string): number {
        const duration = this.getSessionsForDate(date).reduce((total, session) => total + session.duration, 0);
        if (duration == 0) return 0;

        const minDuration = this.getMinDuration();
        const maxDuration = this.getMaxDuration();

        if (minDuration == maxDuration) return 2;

        const interval = (maxDuration - minDuration) / 4;
        const level = Math.round((duration - minDuration) / interval) + 1;
        return Math.max(1, Math.min(4, level));
    }
}

export const sessionManager = new SessionManager();
