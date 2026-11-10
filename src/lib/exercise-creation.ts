// The originating page stays mounted during shallow navigation. Keep the
// result in memory so it can resume without serializing an unfinished workout.
const results = new Map<string, string>();

export function completeExerciseCreation(token: string, exerciseId: string) {
    results.set(token, exerciseId);
}

export function takeCreatedExercise(token: string) {
    const exerciseId = results.get(token);
    results.delete(token);
    return exerciseId;
}
