import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Tag, TagType } from '../types/database';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('tag_type')
        .order('name');
      if (error) throw error;
      setTags(data as Tag[]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = useCallback(async (name: string, tagType: TagType) => {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, tag_type: tagType })
      .select()
      .single();
    if (error) throw error;
    return data as Tag;
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
  }, []);

  const getTagsByType = useCallback(
    (type: TagType) => tags.filter((t) => t.tag_type === type),
    [tags],
  );

  return { tags, loading, fetchTags, createTag, deleteTag, getTagsByType };
}
