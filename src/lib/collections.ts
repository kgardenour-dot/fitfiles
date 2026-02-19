import { supabase } from './supabase';
import { Collection, CollectionWithCount } from '../types/database';

/** Returns the current user's collections ordered by created_at desc. */
export async function listCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Collection[];
}

/** Returns the current user's collections with workout counts (from view). */
export async function listCollectionsWithCounts(): Promise<CollectionWithCount[]> {
  const { data, error } = await supabase
    .from('collections_with_counts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CollectionWithCount[];
}

/**
 * Creates a collection with the given name (user_id from auth.uid() via RLS).
 * Validates: name trimmed, min 1 character.
 * @throws Error with friendly message on validation or Supabase error.
 */
export async function createCollection(name: string): Promise<Collection> {
  const trimmed = name?.trim() ?? '';
  if (trimmed.length < 1) {
    throw new Error('Collection name is required');
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({ name: trimmed })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || /unique|duplicate/i.test(error.message ?? '')) {
      throw new Error('That collection already exists');
    }
    throw new Error(error.message ?? 'Could not create collection');
  }

  return data as Collection;
}
