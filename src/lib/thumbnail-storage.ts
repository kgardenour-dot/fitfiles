import { supabase, SUPABASE_URL } from './supabase';
import { getImageHeadersForThumbnailUrl } from './thumbnail-image';

export const WORKOUT_THUMBNAILS_BUCKET = 'workout-thumbnails';

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20000;

/** Public URL points at our Supabase Storage object for workout thumbnails. */
export function isHostedWorkoutThumbnail(url: string | null | undefined): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  const base = SUPABASE_URL.replace(/\/$/, '');
  return url.startsWith(`${base}/storage/v1/object/public/${WORKOUT_THUMBNAILS_BUCKET}/`);
}

function extFromMime(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

function extFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.(jpe?g|png|webp|gif)$/i);
    if (!m) return null;
    const e = m[1].toLowerCase();
    if (e === 'jpeg' || e === 'jpg') return 'jpg';
    return e;
  } catch {
    return null;
  }
}

/**
 * Remove any previously stored image for this workout (any extension) so replacements do not orphan files.
 */
export async function removeWorkoutThumbnailObjects(
  userId: string,
  workoutId: string,
): Promise<void> {
  const { data: files, error } = await supabase.storage
    .from(WORKOUT_THUMBNAILS_BUCKET)
    .list(userId, { limit: 100 });

  if (error || !files?.length) return;

  const prefix = `${workoutId}.`;
  const toRemove = files
    .filter((f) => f.name.startsWith(prefix))
    .map((f) => `${userId}/${f.name}`);

  if (toRemove.length === 0) return;

  await supabase.storage.from(WORKOUT_THUMBNAILS_BUCKET).remove(toRemove);
}

/**
 * Download a remote preview image and re-upload to Supabase Storage so the URL stays valid long-term.
 * Returns the public storage URL, or null if download/upload failed (caller keeps remote URL).
 */
export async function persistWorkoutThumbnail(
  remoteUrl: string | null | undefined,
  userId: string,
  workoutId: string,
): Promise<string | null> {
  const trimmed = remoteUrl?.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;
  if (isHostedWorkoutThumbnail(trimmed)) return trimmed;

  const headers: Record<string, string> = {
    Accept: 'image/*,*/*;q=0.8',
    ...getImageHeadersForThumbnailUrl(trimmed),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(trimmed, { signal: controller.signal, headers });
  } catch {
    clearTimeout(timeout);
    return null;
  }
  clearTimeout(timeout);

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  if (!contentType.startsWith('image/')) return null;

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;

  await removeWorkoutThumbnailObjects(userId, workoutId);

  const ext = extFromMime(contentType) || extFromUrl(trimmed) || 'jpg';
  const path = `${userId}/${workoutId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(WORKOUT_THUMBNAILS_BUCKET)
    .upload(path, buf, {
      contentType: contentType.split(';')[0].trim() || 'image/jpeg',
      upsert: true,
    });

  if (upErr) return null;

  const { data } = supabase.storage.from(WORKOUT_THUMBNAILS_BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}
