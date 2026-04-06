import React, { createContext, useCallback, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listCollectionsWithCounts, createCollection as createCollectionApi } from '../lib/collections';
import { Collection, CollectionWithCount, WorkoutLinkWithTags } from '../types/database';

interface CollectionsContextValue {
  collections: CollectionWithCount[];
  loading: boolean;
  fetchCollections: () => Promise<void>;
  createCollection: (name: string) => Promise<Collection>;
  updateCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addToCollection: (collectionId: string, workoutLinkId: string) => Promise<void>;
  removeFromCollection: (collectionId: string, workoutLinkId: string) => Promise<void>;
  getCollectionWorkouts: (collectionId: string) => Promise<WorkoutLinkWithTags[]>;
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
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

  const createCollectionMutation = useCallback(
    async (name: string) => {
      const created = await createCollectionApi(name);
      await fetchCollections();
      return created;
    },
    [fetchCollections],
  );

  const updateCollection = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase.from('collections').update({ name }).eq('id', id);
      if (error) throw error;
      await fetchCollections();
    },
    [fetchCollections],
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw error;
      await fetchCollections();
    },
    [fetchCollections],
  );

  const addToCollection = useCallback(
    async (collectionId: string, workoutLinkId: string) => {
      const { error } = await supabase
        .from('collection_items')
        .insert({ collection_id: collectionId, workout_link_id: workoutLinkId });
      if (error && !error.message.includes('duplicate')) throw error;
      await fetchCollections();
    },
    [fetchCollections],
  );

  const removeFromCollection = useCallback(
    async (collectionId: string, workoutLinkId: string) => {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('workout_link_id', workoutLinkId);
      if (error) throw error;
      await fetchCollections();
    },
    [fetchCollections],
  );

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
      return { ...workout, tags } as WorkoutLinkWithTags;
    });
  }, []);

  const value: CollectionsContextValue = {
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

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export function useCollections(): CollectionsContextValue {
  const ctx = useContext(CollectionsContext);
  if (!ctx) throw new Error('useCollections must be used within CollectionsProvider');
  return ctx;
}
