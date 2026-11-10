import { v4 as uuidv4 } from "uuid";
import { type Result } from "./constants";
import { cloud } from "./cloud.svelte";
import { saveSession } from "./workout-repository";
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
    revision?: number;
    routineName?: string;
}

export function createDefaultSession(): Session {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return { id: uuidv4(), duration: 0, exercises: [], routineId: "custom", date, createdAt: now.toISOString() };
}

class SessionManager {
    get sessions() { return cloud.data.sessions; }
    activeSession = $state<Session>(createDefaultSession());

    resetActiveSession() { this.activeSession = createDefaultSession(); }
    getLatestExercise(exerciseId: string): ExerciseMetric {
        const latestSession = Object.values(this.sessions)
            .filter((session) =>
                session.exercises.some(
                    (exercise) => exercise.exerciseId == exerciseId,
                ),
            )
            .sort(compareSessions)[0];

        if (latestSession === undefined) {
            const exercise = exerciseManager.getById(exerciseId);

            switch (exercise?.metricType ?? "weight") {
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
        return { ...latestSession.exercises.find((e) => e.exerciseId == exerciseId)!.metric };
    }

    async addSession(newSession: Session): Promise<Result> {
        // validation
        if (newSession.exercises.length == 0)
            return {
                success: false,
                message: "need to add exercises. no slacking.",
            };

        if (!Number.isInteger(newSession.duration) || newSession.duration <= 0)
            return {
                success: false,
                message: "duration needs to be > 0 mins...",
            };

        const value = $state.snapshot(newSession);
        return cloud.mutate((client) => saveSession(client, value, true));
    }
    async addActiveSession() {
        const result = await this.addSession(this.activeSession);
        if (result.success) this.activeSession = createDefaultSession();
        return result;
    }

    applyRoutine(session: Session): Session {
        if (session.routineId != "custom") {
            const routine = routineManager.getById(session.routineId);
            session.exercises = (routine?.exercises ?? []).map((entry) => ({
                ...entry,
                id: uuidv4(),
                metric: { ...(Object.values(this.sessions).some((saved) => saved.exercises.some((exercise) => exercise.exerciseId === entry.exerciseId))
                    ? this.getLatestExercise(entry.exerciseId) : entry.metric) },
            }));
        } else {
            session.exercises = [];
        }
        return session;
    }

    async updateSession(session: Session): Promise<Result> {
        const value = $state.snapshot(session);
        return cloud.mutate((client) => saveSession(client, value));
    }
    async deleteSession(id: string, revision: number | undefined): Promise<Result> {
        if (!revision) return { success: false, message: "Reload this session before deleting." };
        return cloud.mutate(async (client) => {
            const { error } = await client.rpc("delete_session", { p_id: id, p_expected_revision: revision });
            if (error) throw error;
        });
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
            .sort(compareSessions);
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

export function compareSessions(a: Session, b: Session): number {
    const date = b.date.localeCompare(a.date);
    if (date) return date;
    if (a.startTime && b.startTime) {
        const time = b.startTime.getTime() - a.startTime.getTime();
        if (time) return time;
    } else if (a.startTime || b.startTime) return a.startTime ? -1 : 1;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || b.id.localeCompare(a.id);
}
