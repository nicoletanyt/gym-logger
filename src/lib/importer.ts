import { v4 as uuidv4 } from "uuid";
import {
    exerciseManager,
    type Exercise,
    type ExerciseEntry,
    type ExerciseMetric,
} from "./Exercise.svelte";
import { sessionManager, type Session } from "./Session.svelte";

interface ParsedExercise {
    name: string;
    note: string;
    metricType: Exercise["metricType"];
    metric: ExerciseMetric;
}

interface ParsedSession {
    date: string;
    duration: number;
    exercises: ParsedExercise[];
}

export interface ImportResult {
    sessionsAdded: number;
    exercisesAdded: number;
}

function parseDurationToSeconds(str: string): number {
    const h = /(\d+)\s*(?:h|hr|hrs|hours)/i.exec(str);
    const m = /(\d+)\s*(?:m|min|mins|minutes)\b/i.exec(str);
    let totalMinutes = 0;
    if (h) totalMinutes += parseInt(h[1], 10) * 60;
    if (m) totalMinutes += parseInt(m[1], 10);
    return totalMinutes * 60;
}

function pad2(n: number): string {
    return n.toString().padStart(2, "0");
}

function parseExerciseClause(clause: string): ParsedExercise {
    const c = clause.trim();

    const weightM = /(\d+(?:\.\d+)?)\s*kg/i.exec(c);
    const speedM = /(\d+(?:\.\d+)?)\s*km\/h/i.exec(c);
    const repsM = /x\s*(\d+)/i.exec(c);
    const setsM = /(\d+)\s+sets?/i.exec(c);
    const cardioDurM = /for\s+(\d+)\s*mins?/i.exec(c);
    const durM = /(\d+)\s*mins?/i.exec(c);

    const sets = setsM ? parseInt(setsM[1], 10) : 1;

    let metric: ExerciseMetric;
    let metricType: Exercise["metricType"];

    if (speedM && cardioDurM) {
        const duration = parseInt(cardioDurM[1], 10);
        const speed = parseFloat(speedM[1]);
        metricType = "cardio";
        metric = {
            type: "cardio",
            sets,
            duration,
            distance: Math.round(speed * (duration / 60) * 1000) / 1000,
        };
    } else if (weightM) {
        metricType = "weight";
        metric = {
            type: "weight",
            sets,
            weight: parseFloat(weightM[1]),
            reps: repsM ? parseInt(repsM[1], 10) : 10,
        };
    } else if (repsM) {
        metricType = "reps";
        metric = {
            type: "reps",
            sets,
            reps: parseInt(repsM[1], 10),
        };
    } else if (durM) {
        metricType = "duration";
        metric = {
            type: "duration",
            sets,
            duration: parseInt(durM[1], 10),
        };
    } else {
        throw new Error(`Could not parse exercise clause: "${clause}"`);
    }

    const cleaned = c
        .replace(/\d+(?:\.\d+)?\s*km\/h\s+for\s+\d+\s*mins?/gi, "")
        .replace(/\d+(?:\.\d+)?\s*km\/h/gi, "")
        .replace(/\d+(?:\.\d+)?\s*kg/gi, "")
        .replace(/x\s*\d+/gi, "")
        .replace(/\d+\s+sets?/gi, "")
        .replace(/\d+\s*mins?/gi, "")
        .replace(/\(?\s*new\s*\)?/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
    const name = parts[0] ?? "";
    const note = parts.slice(1).join(", ");

    if (!name) throw new Error(`Could not determine exercise name from "${clause}"`);

    return { name, note, metricType, metric };
}

export function parseImportText(
    text: string,
    year: number = new Date().getFullYear(),
): ParsedSession[] {
    const dateRe = /\b(\d{1,2})\/(\d{1,2})\b/g;
    const dates: { day: number; month: number; len: number; start: number }[] =
        [];
    let m: RegExpExecArray | null;
    while ((m = dateRe.exec(text))) {
        dates.push({
            day: parseInt(m[1], 10),
            month: parseInt(m[2], 10),
            len: m[0].length,
            start: m.index,
        });
    }
    if (dates.length === 0) return [];

    const sessions: ParsedSession[] = [];
    for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const end = i + 1 < dates.length ? dates[i + 1].start : text.length;
        const body = text.slice(d.start + d.len, end);

        let exercisesText = body;
        let duration = 30 * 60;
        const totalMatch = /\b(?:total|duration)\s*:?\s*([^]*)$/i.exec(body);
        if (totalMatch) {
            duration = parseDurationToSeconds(totalMatch[1]);
            exercisesText = body.slice(0, totalMatch.index);
        }

        const clauseRe = /\d+(?:\.\d+)?\s+sets?|\d+\s*mins?/g;
        const clauses: string[] = [];
        let lastEnd = 0;
        let cm: RegExpExecArray | null;
        while ((cm = clauseRe.exec(exercisesText))) {
            clauses.push(
                exercisesText.slice(lastEnd, cm.index + cm[0].length),
            );
            lastEnd = cm.index + cm[0].length;
        }
        if (clauses.length === 0) continue;

        const exercises = clauses.map(parseExerciseClause);
        sessions.push({
            date: `${year}-${pad2(d.month)}-${pad2(d.day)}`,
            duration,
            exercises,
        });
    }
    return sessions;
}

export function importText(text: string): ImportResult {
    const sessions = parseImportText(text);
    let sessionsAdded = 0;
    let exercisesAdded = 0;

    for (const s of sessions) {
        const entries: ExerciseEntry[] = [];
        for (const ex of s.exercises) {
            let exercise = exerciseManager.exercises.find(
                (e) => e.name.toLowerCase() === ex.name.toLowerCase(),
            );
            if (!exercise) {
                exercise = {
                    id: uuidv4(),
                    name: ex.name,
                    note: ex.note,
                    metricType: ex.metricType,
                };
                exerciseManager.exercises.push(exercise);
                exercisesAdded++;
            }
            const entry = exerciseManager.createEntry(exercise.id, ex.metric);
            if (entry.success) entries.push(entry.data);
        }
        if (entries.length === 0) continue;

        const session: Session = {
            id: uuidv4(),
            duration: s.duration,
            effort: 3,
            exercises: entries,
            routineId: "custom",
            date: s.date,
        };
        const result = sessionManager.addSession(session);
        if (result.success) sessionsAdded++;
    }

    exerciseManager.updateData();
    sessionManager.updateData();
    return { sessionsAdded, exercisesAdded };
}
