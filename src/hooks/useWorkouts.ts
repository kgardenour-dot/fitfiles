import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { WorkoutLink, WorkoutLinkWithTags, Tag } from '../types/database';

export type SortOption = 'recent' | 'opened' | 'favorites';

interface UseWorkoutsOptions {
  search?: string;
  tagIds?: string[];
  sort?: SortOption;
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutLinkWithTags[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkouts = useCallback(async (options: UseWorkoutsOptions = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('workout_links')
        .select('*, workout_link_tags(tag_id, tags(*))');

      // Full-text search on title + notes
      if (options.search && options.search.trim()) {
        const term = options.search.trim().split(/\s+/).join(' & ');
        query = query.textSearch('title', term, { type: 'websearch', config: 'english' });
      }

      // Sort
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

      // Flatten tag joins
      const results: WorkoutLinkWithTags[] = (data ?? []).map((row: any) => {
        const tags: Tag[] = (row.workout_link_tags ?? [])
          .map((wlt: any) => wlt.tags)
          .filter(Boolean);
        const { workout_link_tags: _, ...workout } = row;
        return { ...workout, tags };
      });

      // Client-side tag filter (when the user selects tag chips)
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
    ) => {
      const { data, error } = await supabase
        .from('workout_links')
        .insert(workout)
        .select()
        .single();
      if (error) throw error;

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

      return data as WorkoutLink;
    },
    [],
  );

  const updateWorkout = useCallback(
    async (
      id: string,
      updates: Partial<Pick<WorkoutLink, 'title' | 'notes' | 'duration_minutes' | 'is_favorite' | 'thumbnail_url'>>,
      tagIds?: string[],
    ) => {
      const { error } = await supabase
        .from('workout_links')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      if (tagIds !== undefined) {
        // Replace all tags
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
    const { error } = await supabase.from('workout_links').delete().eq('id', id);
    if (error) throw error;
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

  return {
    workouts,
    loading,
    fetchWorkouts,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    toggleFavorite,
    markOpened,
    markDone,
  };
}
