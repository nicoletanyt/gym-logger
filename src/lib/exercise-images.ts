import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const IMAGE_BUCKET = 'exercise-images';
export const STORAGE_PREFIX = 'storage:exercise-images/';
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const libraryImages = [
    { name: 'Dumbbell', path: '/exercise-images/dumbbell.jpg' },
    { name: 'Deadlift', path: '/exercise-images/deadlift.jpg' },
    { name: 'Squat', path: '/exercise-images/squat.jpg' },
    { name: 'Treadmill', path: '/exercise-images/treadmill.jpg' },
    { name: 'Handstand push-up', path: '/exercise-images/push-up.jpg' },
    { name: 'Stretching', path: '/exercise-images/stretching.jpg' },
];

export function validateImage(file: File): string | null {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) return 'Choose an image no larger than 5 MB.';
    return null;
}

export async function uploadExerciseImage(client: SupabaseClient<Database>, ownerId: string, file: File): Promise<string> {
    const invalid = validateImage(file);
    if (invalid) throw new Error(invalid);
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return STORAGE_PREFIX + path;
}
