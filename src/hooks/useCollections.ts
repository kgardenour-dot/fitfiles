import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { listCollectionsWithCounts, createCollection } from '../lib/collections';
import { CollectionWithCount } from '../types/database';

export function useCollections() {
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const results = await listCollectionsWithCounts();
      setCollections(results);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCollectionMutation = useCallback(async (name: string) => {
    return createCollection(name);
  }, []);

  const updateCollection = useCallback(async (id: string, name: string) => {
    const { error } = await supabase
      .from('collections')
      .update({ name })
      .eq('id', id);
    if (error) throw error;
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    const { error } = await supabase.from('collections').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const addToCollection = useCallback(async (collectionId: string, workoutLinkId: string) => {
    const { error } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, workout_link_id: workoutLinkId });
    if (error && !error.message.includes('duplicate')) throw error;
  }, []);

  const removeFromCollection = useCallback(async (collectionId: string, workoutLinkId: string) => {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('workout_link_id', workoutLinkId);
    if (error) throw error;
  }, []);

  const getCollectionWorkouts = useCallback(async (collectionId: string) => {
    const { data, error } = await supabase
      .from('collection_items')
      .select('workout_link_id, workout_links(*, workout_link_tags(tag_id, tags(*)))')
      .eq('collection_id', collectionId);
    if (error) throw error;
    return (data ?? []).map((row: any) => {
      const wl = row.workout_links;
      const tags = (wl?.workout_link_tags ?? []).map((wlt: any) => wlt.tags).filter(Boolean);
      const { workout_link_tags: _, ...workout } = wl ?? {};
      return { ...workout, tags };
    });
  }, []);

  return {
    collections,
    loading,
    fetchCollections,
    createCollection: createCollectionMutation,
    updateCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    getCollectionWorkouts,
  };
}
