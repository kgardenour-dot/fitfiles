import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useWorkouts } from '../../src/hooks/useWorkouts';
import { useTags } from '../../src/hooks/useTags';
import { TagSelector } from '../../src/components/TagSelector';
import { WorkoutLinkWithTags, TagType } from '../../src/types/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { updateWorkout } = useWorkouts();
  const { tags, fetchTags, createTag } = useTags();

  const [workout, setWorkout] = useState<WorkoutLinkWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const fetchWorkout = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('workout_links')
      .select('*, workout_link_tags(tag_id, tags(*))')
      .eq('id', id)
      .single();
    if (!data) {
      router.back();
      return;
    }
    const wTags = (data.workout_link_tags ?? []).map((wlt: any) => wlt.tags).filter(Boolean);
    const { workout_link_tags: _, ...rest } = data;
    const w = { ...rest, tags: wTags } as WorkoutLinkWithTags;
    setWorkout(w);
    setTitle(w.title);
    setNotes(w.notes ?? '');
    setDurationMinutes(w.duration_minutes?.toString() ?? '');
    setThumbnailUrl(w.thumbnail_url ?? '');
    setSelectedTags(new Set(wTags.map((t: any) => t.id)));
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchWorkout();
    fetchTags();
  }, [fetchWorkout, fetchTags]);

  const handleSave = async () => {
    if (!workout) return;
    setSaving(true);
    try {
      await updateWorkout(
        workout.id,
        {
          title: title.trim() || workout.url,
          notes: notes.trim() || null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
          thumbnail_url: thumbnailUrl.trim() || null,
        },
        [...selectedTags],
      );
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleCreateTag = async (name: string, type: TagType) => {
    try {
      const tag = await createTag(name, type);
      setSelectedTags((prev) => new Set(prev).add(tag.id));
      fetchTags();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Workout</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.urlText}>{workout?.url}</Text>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Workout title"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Thumbnail URL</Text>
          <TextInput
            style={styles.input}
            value={thumbnailUrl}
            onChangeText={setThumbnailUrl}
            placeholder="https://..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="e.g. 30"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Tags</Text>
          <TagSelector
            tags={tags}
            selectedIds={selectedTags}
            onToggle={handleToggleTag}
            onCreateTag={handleCreateTag}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  form: {
    paddingHorizontal: Spacing.md,
  },
  urlText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  multiline: {
    height: 90,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
