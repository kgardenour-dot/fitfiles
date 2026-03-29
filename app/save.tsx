import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkouts } from '../src/hooks/useWorkouts';
import { useTags } from '../src/hooks/useTags';
import { useAuth } from '../src/hooks/useAuth';
import { useEntitlements } from '../src/hooks/useEntitlements';
import { TagSelector } from '../src/components/TagSelector';
import { fetchOGMetadata, extractDomain } from '../src/lib/og-scraper';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { TagType } from '../src/types/database';
import { DEFAULT_TAGS } from '../src/constants/tags';
import { ConfettiDots } from '../src/components/ConfettiDots';

export default function SaveScreen() {
  const router = useRouter();
  const { createWorkout, workouts, fetchWorkouts } = useWorkouts();
  const { tags, fetchTags, createTag } = useTags();
  const { profile } = useAuth();
  const { canSaveWorkout } = useEntitlements(profile);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTags();
    fetchWorkouts(); // To count workouts for gating
  }, [fetchTags, fetchWorkouts]);

  // Seed default tags if none exist
  useEffect(() => {
    if (tags.length === 0) {
      const seed = async () => {
        for (const t of DEFAULT_TAGS) {
          try {
            await createTag(t.name, t.tag_type);
          } catch {
            // ignore duplicates
          }
        }
        fetchTags();
      };
      seed();
    }
  }, [tags.length, createTag, fetchTags]);

  const handlePreview = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL.');
      return;
    }
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
      setUrl(normalizedUrl);
    }
    setPreviewing(true);
    const meta = await fetchOGMetadata(normalizedUrl);
    if (meta.title && !title) setTitle(meta.title);
    if (meta.image && !thumbnailUrl) setThumbnailUrl(meta.image);
    setPreviewing(false);
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL.');
      return;
    }
    if (!canSaveWorkout(workouts.length)) {
      router.push('/upgrade');
      return;
    }
    setSaving(true);
    try {
      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      const { wasDuplicate } = await createWorkout(
        {
          url: normalizedUrl,
          title: title.trim() || normalizedUrl,
          source_domain: extractDomain(normalizedUrl),
          thumbnail_url: thumbnailUrl.trim() || null,
          notes: notes.trim() || null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
          is_favorite: false,
        },
        [...selectedTags],
      );
      if (wasDuplicate) {
        Alert.alert('Link updated', 'Updated your existing link.', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        router.back();
      }
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Save Workout</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          {/* URL + Preview */}
          <Text style={styles.label}>URL</Text>
          <View style={styles.urlRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={handlePreview}
              disabled={previewing}
            >
              {previewing ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Text style={styles.previewBtnText}>Preview</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Thumbnail preview */}
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbPreview} />
          ) : null}

          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Workout title"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Duration */}
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="e.g. 30"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
          />

          {/* Notes */}
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this workout..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          {/* Tags */}
          <Text style={styles.label}>Tags</Text>
          <Text style={styles.helperText}>Tip: Add 1-3 tags to make search faster later.</Text>
          <TagSelector
            tags={tags}
            selectedIds={selectedTags}
            onToggle={handleToggleTag}
            onCreateTag={handleCreateTag}
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Workout'}</Text>
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
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  helperText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
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
  urlRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  previewBtn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    height: 48,
  },
  previewBtnText: {
    color: Colors.aquaMint,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  thumbPreview: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.coralPulse,
    borderRadius: BorderRadius.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    shadowColor: Colors.coralPulse,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
