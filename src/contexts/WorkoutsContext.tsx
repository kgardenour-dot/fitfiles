import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { canonicalizeUrl, extractDomain, fetchUrlMetadata } from '../lib/og-scraper';
import {
  isHostedWorkoutThumbnail,
  persistWorkoutThumbnail,
  removeWorkoutThumbnailObjects,
} from '../lib/thumbnail-storage';
import { WorkoutLink, WorkoutLinkWithTags, Tag } from '../types/database';

export type SortOption = 'recent' | 'opened' | 'favorites';

interface UseWorkoutsOptions {
  search?: string;
  tagIds?: string[];
  sort?: SortOption;
}

interface WorkoutsContextValue {
  workouts: WorkoutLinkWithTags[];
  loading: boolean;
  fetchWorkouts: (options?: UseWorkoutsOptions) => Promise<void>;
  removeWorkoutLink: (id: string) => void;
  createWorkout: (
    workout: Omit<WorkoutLink, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_opened_at'>,
    tagIds: string[],
  ) => Promise<{ data: WorkoutLink; wasDuplicate: boolean }>;
  updateWorkout: (
    id: string,
    updates: Partial<Pick<WorkoutLink, 'title' | 'notes' | 'duration_minutes' | 'is_favorite' | 'thumbnail_url'>>,
    tagIds?: string[],
  ) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  toggleFavorite: (id: string, current: boolean) => Promise<void>;
  markOpened: (id: string) => Promise<void>;
  markDone: (id: string) => Promise<void>;
}

const WorkoutsContext = createContext<WorkoutsContextValue | null>(null);

function isLocalFileUri(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('file://');
}

async function resolvePersistentThumbnail(
  workoutUrl: string,
  thumbnailUrl: string | null | undefined,
): Promise<string | null> {
  if (!isLocalFileUri(thumbnailUrl)) return thumbnailUrl ?? null;
  try {
    const refreshed = await fetchUrlMetadata(workoutUrl);
    return refreshed.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

async function maybePersistThumbnailToStorage(
  remoteUrl: string | null | undefined,
  userId: string,
  workoutId: string,
): Promise<string | null> {
  const trimmed = remoteUrl?.trim();
  if (!trimmed) return null;
  const stored = await persistWorkoutThumbnail(trimmed, userId, workoutId);
  return stored ?? trimmed;
}

export function WorkoutsProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<WorkoutLinkWithTags[]>([]);
  const [loading, setLoading] = useState(false);

  const removeWorkoutLink = useCallback((id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const fetchWorkouts = useCallback(async (options: UseWorkoutsOptions = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('workout_links')
        .select('*, workout_link_tags(tag_id, tags(*))');

      if (options.search && options.search.trim()) {
        const term = options.search.trim();
        query = query.textSearch('search_vector', term, { type: 'websearch', config: 'english' });
      }

      switch (options.sort) {
        case 'opened':
          query = query.order('last_opened_at', { ascending: false, nullsFirst: false });
          break;
        case 'favorites':
          query = query
            .eq('is_favorite', true)
            .order('created_at', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      const results: WorkoutLinkWithTags[] = (data ?? []).map((row: any) => {
        const tags: Tag[] = (row.workout_link_tags ?? [])
          .map((wlt: any) => wlt.tags)
          .filter(Boolean);
        const { workout_link_tags: _, ...workout } = row;
        return { ...workout, tags };
      });

      if (options.tagIds && options.tagIds.length > 0) {
        const tagSet = new Set(options.tagIds);
        const filtered = results.filter((w) =>
          w.tags.some((t) => tagSet.has(t.id)),
        );
        setWorkouts(filtered);
      } else {
        setWorkouts(results);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkout = useCallback(
    async (
      workout: Omit<WorkoutLink, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_opened_at'>,
      tagIds: string[],
    ): Promise<{ data: WorkoutLink; wasDuplicate: boolean }> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('You must be signed in to save a workout.');

      const url = canonicalizeUrl(workout.url);
      const persistentThumbnail = await resolvePersistentThumbnail(url, workout.thumbnail_url);
      const payload = {
        user_id: userId,
        url,
        title: workout.title,
        source_domain:
          extractDomain(url) || (workout.source_domain ?? ''),
        thumbnail_url: persistentThumbnail,
        notes: workout.notes ?? null,
        duration_minutes: workout.duration_minutes ?? null,
        is_favorite: workout.is_favorite ?? false,
      };

      const { data, error } = await supabase
        .from('workout_links')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('workout_links')
            .select('id')
            .eq('user_id', userId)
            .eq('url', url)
            .single();
          if (!existing) throw error;

          const updates = {
            title: workout.title,
            notes: workout.notes,
            thumbnail_url: persistentThumbnail,
            source_domain: workout.source_domain,
          };
          const { data: updated, error: updateErr } = await supabase
            .from('workout_links')
            .update(updates)
            .eq('id', existing.id)
            .select()
            .single();
          if (updateErr) throw updateErr;

          if (tagIds.length > 0) {
            await supabase.from('workout_link_tags').delete().eq('workout_link_id', existing.id);
            const links = tagIds.map((tag_id) => ({
              workout_link_id: existing.id,
              tag_id,
            }));
            await supabase.from('workout_link_tags').insert(links);
          }

          let result = updated as WorkoutLink;
          if (persistentThumbnail) {
            const storedUrl = await maybePersistThumbnailToStorage(
              persistentThumbnail,
              userId,
              result.id,
            );
            if (storedUrl && storedUrl !== result.thumbnail_url) {
              const { data: withThumb, error: tErr } = await supabase
                .from('workout_links')
                .update({ thumbnail_url: storedUrl })
                .eq('id', result.id)
                .select()
                .single();
              if (!tErr && withThumb) result = withThumb as WorkoutLink;
            }
          }

          return { data: result, wasDuplicate: true };
        }
        throw error;
      }

      if (tagIds.length > 0) {
        const links = tagIds.map((tag_id) => ({
          workout_link_id: data.id,
          tag_id,
        }));
        const { error: tagError } = await supabase
          .from('workout_link_tags')
          .insert(links);
        if (tagError) throw tagError;
      }

      let result = data as WorkoutLink;
      if (persistentThumbnail) {
        const storedUrl = await maybePersistThumbnailToStorage(
          persistentThumbnail,
          userId,
          result.id,
        );
        if (storedUrl && storedUrl !== result.thumbnail_url) {
          const { data: withThumb, error: tErr } = await supabase
            .from('workout_links')
            .update({ thumbnail_url: storedUrl })
            .eq('id', result.id)
            .select()
            .single();
          if (!tErr && withThumb) result = withThumb as WorkoutLink;
        }
      }

      return { data: result, wasDuplicate: false };
    },
    [],
  );

  const updateWorkout = useCallback(
    async (
      id: string,
      updates: Partial<Pick<WorkoutLink, 'title' | 'notes' | 'duration_minutes' | 'is_favorite' | 'thumbnail_url'>>,
      tagIds?: string[],
    ) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('You must be signed in to update a workout.');

      const normalizedUpdates = { ...updates };

      if (isLocalFileUri(normalizedUpdates.thumbnail_url)) {
        const { data: row } = await supabase
          .from('workout_links')
          .select('url')
          .eq('id', id)
          .single();
        const persistentThumbnail = await resolvePersistentThumbnail(row?.url ?? '', normalizedUpdates.thumbnail_url);
        normalizedUpdates.thumbnail_url = persistentThumbnail;
      }

      if (normalizedUpdates.thumbnail_url !== undefined) {
        if (normalizedUpdates.thumbnail_url === null) {
          await removeWorkoutThumbnailObjects(userId, id);
        } else {
          const thumb = normalizedUpdates.thumbnail_url;
          if (thumb && !isHostedWorkoutThumbnail(thumb)) {
            normalizedUpdates.thumbnail_url = await maybePersistThumbnailToStorage(thumb, userId, id);
          }
        }
      }

      const { error } = await supabase
        .from('workout_links')
        .update(normalizedUpdates)
        .eq('id', id);
      if (error) throw error;

      if (tagIds !== undefined) {
        await supabase.from('workout_link_tags').delete().eq('workout_link_id', id);
        if (tagIds.length > 0) {
          const links = tagIds.map((tag_id) => ({ workout_link_id: id, tag_id }));
          await supabase.from('workout_link_tags').insert(links);
        }
      }
    },
    [],
  );

  const deleteWorkout = useCallback(async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('You must be signed in to delete a workout.');

    const { error } = await supabase
      .from('workout_links')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      const msg = [error.code, error.message, error.details].filter(Boolean).join(' — ');
      throw new Error(msg || 'Delete failed');
    }

    await removeWorkoutThumbnailObjects(userId, id);
  }, []);

  const toggleFavorite = useCallback(async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('workout_links')
      .update({ is_favorite: !current })
      .eq('id', id);
    if (error) throw error;
  }, []);

  const markOpened = useCallback(async (id: string) => {
    await supabase
      .from('workout_links')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', id);
    await supabase
      .from('workout_events')
      .insert({ workout_link_id: id, event_type: 'opened' });
  }, []);

  const markDone = useCallback(async (id: string) => {
    await supabase
      .from('workout_events')
      .insert({ workout_link_id: id, event_type: 'done' });
  }, []);

  const value: WorkoutsContextValue = {
    workouts,
    loading,
    fetchWorkouts,
    removeWorkoutLink,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    toggleFavorite,
    markOpened,
    markDone,
  };

  return (
    <WorkoutsContext.Provider value={value}>
      {children}
    </WorkoutsContext.Provider>
  );
}

export function useWorkouts(): WorkoutsContextValue {
  const ctx = useContext(WorkoutsContext);
  if (!ctx) throw new Error('useWorkouts must be used within WorkoutsProvider');
  return ctx;
}
