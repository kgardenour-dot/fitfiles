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

function normalizeIncomingUrl(raw: string): string {
  try {
    const u = new URL(raw);

    // Google redirect pattern
    if (u.hostname.includes('google.') && u.searchParams.has('q')) {
      return u.searchParams.get('q') || raw;
    }

    // Pinterest redirect pattern
    if (u.hostname.includes('pinterest.') && u.searchParams.has('url')) {
      return u.searchParams.get('url') || raw;
    }

    // YouTube short link canonicalization
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }

    // YouTube watch normalization
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/watch?v=${v}`;
    }

    return raw;
  } catch {
    return raw;
  }
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
    shareNonce?: string | string[];
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveCompleted, setSaveCompleted] = useState(false);
  const [upgradeShown, setUpgradeShown] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const saveDebugText = saveStatus; // alias for any legacy references
  const consumedShareNonceRef = useRef<string | null>(null);
  const saveCompletedRef = useRef(false);
  const hasUserEditedTitleRef = useRef(false);

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
    if (saveCompleted) return;
    const sourceUrl = pickParam(params.sourceUrl ?? params.url);
    const sourceText = pickParam(params.sourceText ?? params.text);
    const fileUrlParam = pickParam(params.fileUrl);
    let resolvedUrl = sourceUrl || '';
    if (!resolvedUrl && sourceText) {
      const extracted = extractFirstUrl(sourceText);
      if (extracted) resolvedUrl = extracted;
    }
    if (resolvedUrl) setUrl(normalizeIncomingUrl(resolvedUrl));
    if (fileUrlParam) setFileUrl(fileUrlParam);
    const titleVal = pickParam(params.title);
    if (titleVal) setTitle(titleVal);
  }, [saveCompleted, params.sourceUrl, params.url, params.sourceText, params.text, params.fileUrl, params.title]);

  // Auto-fill title and thumbnail from URL metadata — only depends on url, runs after shared payload sets url
  useEffect(() => {
    if (!url) return;
    if (saveCompleted) return;
    if (hasUserEditedTitleRef.current) return;

    const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : 'https://' + url.trim();
    let cancelled = false;

    async function run() {
      const meta = await fetchUrlMetadata(normalized);
      if (cancelled) return;
      if (!meta) return;
      if (saveCompletedRef.current) return;
      if (hasUserEditedTitleRef.current) return;

      setTitle((prev) => (prev.trim() ? prev : meta.title || prev));
      if (meta.thumbnail_url) {
        setThumbnailUrl(meta.thumbnail_url);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [url]);

  // Load shared payload from App Group UserDefaults (iOS share extension) — consume by shareNonce only
  useEffect(() => {
    const shareNonce = pickParam(params.shareNonce);
    const sharedKey = pickParam(params.sharedKey);
    if (!sharedKey || !shareNonce) return;
    if (consumedShareNonceRef.current === shareNonce) return;
    if (saveCompleted) return;
    if (isSaving) return;

    consumedShareNonceRef.current = shareNonce;
    console.log('[FitLinks] CONSUME share', { sharedKey, shareNonce });
    const sharedType = pickParam(params.sharedType);

    getSharedPayload(sharedKey, sharedType).then((payload) => {
      console.log('[FitLinks] getSharedPayload result:', payload);
      if (!payload?.value) {
        console.log('[FitLinks] ⚠️ No payload value returned');
        return;
      }
      if (saveCompletedRef.current) return;

      const val = payload.value.trim();
      console.log('[FitLinks] Payload value:', val.substring(0, 120));
      if (val.startsWith('http://') || val.startsWith('https://')) {
        console.log('[FitLinks] Setting URL from payload');
        setUrl(normalizeIncomingUrl(val));
      } else if (val.startsWith('file://')) {
        console.log('[FitLinks] Setting file URL from payload');
        setFileUrl(val);
        setUrl(val);
      } else {
        const extracted = extractFirstUrl(val);
        if (extracted) {
          console.log('[FitLinks] Extracted URL from text:', extracted);
          setUrl(normalizeIncomingUrl(extracted));
        } else {
          console.log('[FitLinks] No URL found, adding to notes');
          setNotes((prev) => (prev ? `${prev}\n\n${val}` : val));
        }
      }

      clearSharedPayload(sharedKey).catch(() => {});
    });
  }, [params.sharedKey, params.sharedType, params.shareNonce, saveCompleted, isSaving]);

  const handlePasteSample = async () => {
    setUrl(SAMPLE_LINK);
  };

  const goToLibraryNow = () => {
    setSaveStatus('Navigating now...');
    requestAnimationFrame(() => {
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save.');
      return;
    }

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

    setIsSaving(true);
    setSaveStatus('Saving workout_link...');
    let saveSucceeded = false;
    try {
      let normalizedUrl = trimmedUrl;
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      normalizedUrl = normalizeIncomingUrl(normalizedUrl);

      const { data } = await createWorkout(
        {
          url: normalizedUrl,
          title: title.trim() || normalizedUrl,
          source_domain: extractDomain(normalizedUrl),
          thumbnail_url: thumbnailUrl ?? null,
          notes: notes.trim() || null,
          duration_minutes: null,
          is_favorite: false,
        },
        [],
      );

      setSaveStatus('Workout saved. Assigning collections...');

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
        } catch (collErr: unknown) {
          const isSupabase = collErr && typeof collErr === 'object' && 'code' in collErr;
          const errMsg = isSupabase
            ? `${(collErr as { code?: string; message?: string }).code ?? 'unknown'}: ${(collErr as { message?: string }).message ?? 'Unknown'}`
            : "Your workout was saved, but we couldn't add it to the selected collections.";
          if (__DEV__) console.warn('[Import] Collection add failed:', errMsg);
          saveSucceeded = true;
          setSaveCompleted(true);
          saveCompletedRef.current = true;
          setSaveStatus('Done. Navigating to Library...');
          goToLibraryNow();
          return;
        }
      }

      saveSucceeded = true;
      setSaveCompleted(true);
      saveCompletedRef.current = true;
      setSaveStatus('Done. Navigating to Library...');
      goToLibraryNow();
      return;
    } catch (err: unknown) {
      const isSupabase = err && typeof err === 'object' && 'code' in err;
      if (isSupabase) {
        const e = err as { code?: string; message?: string; details?: unknown };
        const details = e.details != null ? `\n\nDetails: ${JSON.stringify(e.details)}` : '';
        Alert.alert('Supabase Error', `${e.code ?? 'unknown'}: ${e.message ?? 'Unknown error'}${details}`);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to save workout link.';
      const isQuotaOrTier = /quota|limit|tier|upgrade/i.test(message);
      if (isQuotaOrTier && !upgradeShown) {
        setUpgradeShown(true);
        router.push('/upgrade');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      if (!saveSucceeded) {
        setIsSaving(false);
        setSaveStatus('');
      }
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
          {__DEV__ && (pickParam(params.sharedKey) || pickParam(params.shareNonce)) ? (
            <View style={styles.debugPanel}>
              <Text style={styles.debugTitle}>🔍 Share Debug Info</Text>
              <Text style={styles.debugLine}>sharedKey: {pickParam(params.sharedKey) ?? '—'}</Text>
              <Text style={styles.debugLine}>sharedType: {pickParam(params.sharedType) ?? '—'}</Text>
              <Text style={styles.debugLine}>shareNonce: {pickParam(params.shareNonce) ?? '—'}</Text>
              <Text style={styles.debugLine}>sourceUrl: {pickParam(params.sourceUrl) ?? '—'}</Text>
              <Text style={styles.debugLine}>sourceText: {pickParam(params.sourceText) ? `${String(pickParam(params.sourceText)).substring(0, 40)}...` : '—'}</Text>
              <Text style={styles.debugLine}>fileUrl: {pickParam(params.fileUrl) ?? '—'}</Text>
              <Text style={styles.debugLine}>Current url state: {url || '(empty)'}</Text>
              <Text style={styles.debugLine}>Current fileUrl state: {fileUrl || '(empty)'}</Text>
            </View>
          ) : null}
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
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <View style={styles.saveBtnContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>

          {__DEV__ && saveStatus ? (
            <Text style={{ fontSize: 12, opacity: 0.6, marginTop: Spacing.sm }}>{saveStatus}</Text>
          ) : null}

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
  debugPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  debugTitle: {
    color: Colors.aquaMint,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  debugLine: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
