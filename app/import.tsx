import { useState, useEffect, useRef } from 'react';
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
import { useWorkouts } from '../src/hooks/useWorkouts';
import { useCollections } from '../src/hooks/useCollections';
import { useAuth } from '../src/hooks/useAuth';
import { useEntitlements } from '../src/hooks/useEntitlements';
import { supabase } from '../src/lib/supabase';
import { extractDomain, fetchUrlMetadata } from '../src/lib/og-scraper';
import { extractFirstUrl } from '../src/utils/url';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { getSharedPayload, clearSharedPayload } from '../src/native/sharedItems';

const SAMPLE_LINK = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function pickParam(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  return typeof s === 'string' && s.trim() ? s.trim() : undefined;
}

export default function ImportScreen() {
  const params = useLocalSearchParams<{
    sourceUrl?: string;
    url?: string;
    sourceText?: string;
    text?: string;
    fileUrl?: string;
    title?: string;
    sharedKey?: string;
    sharedType?: string;
  }>();
  const router = useRouter();
  const { createWorkout, workouts, fetchWorkouts } = useWorkouts();
  const { collections, fetchCollections } = useCollections();
  const { profile, user } = useAuth();
  const { canSaveWorkout } = useEntitlements(profile);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [upgradeShown, setUpgradeShown] = useState(false);
  const hasLoadedSharedRef = useRef(false);
  const hasUserEditedTitleRef = useRef(false);
  const lastFetchedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const toggleCollection = (id: string) => {
    setSelectedCollectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Prefill from params (share intent or deep link)
  useEffect(() => {
    const sourceUrl = pickParam(params.sourceUrl ?? params.url);
    const sourceText = pickParam(params.sourceText ?? params.text);
    const fileUrlParam = pickParam(params.fileUrl);
    let resolvedUrl = sourceUrl || '';
    if (!resolvedUrl && sourceText) {
      const extracted = extractFirstUrl(sourceText);
      if (extracted) resolvedUrl = extracted;
    }
    if (resolvedUrl) setUrl(resolvedUrl);
    if (fileUrlParam) setFileUrl(fileUrlParam);
    const titleVal = pickParam(params.title);
    if (titleVal) setTitle(titleVal);
  }, [params.sourceUrl, params.url, params.sourceText, params.text, params.fileUrl, params.title]);

  // Auto-fill title and thumbnail from URL metadata when sourceUrl is present
  useEffect(() => {
    const raw = url.trim();
    if (!raw) return;

    const normalized = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    hasUserEditedTitleRef.current = false;
    lastFetchedUrlRef.current = normalized;

    fetchUrlMetadata(normalized)
      .then((meta) => {
        if (lastFetchedUrlRef.current !== normalized) return;
        setTitle((prev) => {
          if (hasUserEditedTitleRef.current || prev.trim()) return prev;
          return meta.title || prev;
        });
        setThumbnailUrl(meta.thumbnail_url);
      })
      .catch(() => {});
  }, [url]);

  // Load shared payload from App Group UserDefaults (iOS share extension)
  useEffect(() => {
    const sharedKey = pickParam(params.sharedKey);
    if (!sharedKey || hasLoadedSharedRef.current) return;

    hasLoadedSharedRef.current = true;
    const sharedType = pickParam(params.sharedType);

    getSharedPayload(sharedKey, sharedType).then((payload) => {
      if (!payload?.value) return;

      const val = payload.value.trim();
      if (val.startsWith('http://') || val.startsWith('https://')) {
        setUrl(val);
      } else if (val.startsWith('file://')) {
        setFileUrl(val);
        // Also show path in url field for display; user can clear if needed
        setUrl(val);
      } else {
        // Plain text: try to extract URL, else put in notes
        const extracted = extractFirstUrl(val);
        if (extracted) {
          setUrl(extracted);
        } else {
          setNotes((prev) => (prev ? `${prev}\n\n${val}` : val));
        }
      }

      clearSharedPayload(sharedKey).catch(() => {});
    });
  }, [params.sharedKey, params.sharedType]);

  const handlePasteSample = async () => {
    setUrl(SAMPLE_LINK);
  };

  const handleSave = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      Alert.alert('URL required', 'Please enter a URL to save.');
      return;
    }

    if (!canSaveWorkout(workouts.length)) {
      setUpgradeShown(true);
      router.push('/upgrade');
      return;
    }

    setSaving(true);
    try {
      let normalizedUrl = trimmedUrl;
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      const { data, wasDuplicate } = await createWorkout(
        {
          url: normalizedUrl,
          title: title.trim() || normalizedUrl,
          source_domain: extractDomain(normalizedUrl),
          thumbnail_url: thumbnailUrl,
          notes: notes.trim() || null,
          duration_minutes: null,
          is_favorite: false,
        },
        [],
      );

      const navigateToWorkout = () => router.replace(`/workout/${data.id}`);

      // Add to selected collections (non-blocking; don't fail import)
      const ids = Array.from(selectedCollectionIds);
      if (ids.length > 0 && user?.id) {
        try {
          const rows = ids.map((collection_id) => ({
            collection_id,
            workout_link_id: data.id,
            user_id: user.id,
          }));
          const { error } = await supabase
            .from('collection_items')
            .upsert(rows, { onConflict: 'collection_id,workout_link_id', ignoreDuplicates: true });
          if (error) throw error;
        } catch {
          Alert.alert(
            wasDuplicate ? 'Link updated' : 'Saved',
            "Your workout was saved, but we couldn't add it to the selected collections.",
            [{ text: 'OK', onPress: navigateToWorkout }],
          );
          return;
        }
      }

      if (wasDuplicate) {
        Alert.alert('Link updated', 'Updated your existing link.', [{ text: 'OK', onPress: navigateToWorkout }]);
      } else {
        navigateToWorkout();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save workout link.';
      const isQuotaOrTier = /quota|limit|tier|upgrade/i.test(message);
      if (isQuotaOrTier && !upgradeShown) {
        setUpgradeShown(true);
        router.push('/upgrade');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import Link</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          {pickParam(params.sharedKey) && (
            <Text style={styles.debugLine}>
              Received sharedKey: {pickParam(params.sharedKey)} (type: {pickParam(params.sharedType) ?? '—'})
            </Text>
          )}
          <Text style={styles.label}>URL (required)</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.secondaryBtn} onPress={handlePasteSample}>
            <Ionicons name="link-outline" size={18} color={Colors.aquaMint} />
            <Text style={styles.secondaryBtnText}>Paste sample link</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(text) => {
              hasUserEditedTitleRef.current = true;
              setTitle(text);
            }}
            placeholder="Workout title"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Add to collections (optional)</Text>
          {collections.length === 0 ? (
            <Text style={styles.emptyCollectionsText}>No collections yet. Create one from the Collections tab.</Text>
          ) : (
            <View style={styles.collectionList}>
              {collections.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.collectionRow}
                  onPress={() => toggleCollection(c.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, selectedCollectionIds.has(c.id) && styles.checkboxChecked]}>
                    {selectedCollectionIds.has(c.id) && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.collectionName}>{c.name}</Text>
                  {typeof c.workout_count === 'number' && (
                    <Text style={styles.collectionCount}>{c.workout_count} workouts</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
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
  debugLine: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
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
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  secondaryBtnText: {
    color: Colors.aquaMint,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyCollectionsText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  collectionList: {
    gap: Spacing.xs,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.aquaMint,
    borderColor: Colors.aquaMint,
  },
  collectionName: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  collectionCount: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  saveBtn: {
    backgroundColor: Colors.coralPulse,
    borderRadius: BorderRadius.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
