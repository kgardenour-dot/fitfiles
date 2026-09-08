import { supabase } from './supabase';

export async function countOwnedWorkoutLinks(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('workout_links')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}

export async function countOwnedCollections(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}
