import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { fetchUrlMetadata } from '../../src/lib/og-scraper';
import { thumbnailImageSource } from '../../src/lib/thumbnail-image';
import { useWorkouts } from '../../src/hooks/useWorkouts';
import { useCollections } from '../../src/hooks/useCollections';
import { WorkoutLinkWithTags } from '../../src/types/database';
import { Chip } from '../../src/components/Chip';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { ConfettiDots } from '../../src/components/ConfettiDots';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toggleFavorite, markOpened, markDone, deleteWorkout, removeWorkoutLink, updateWorkout } =
    useWorkouts();
  const { collections, fetchCollections, addToCollection, removeFromCollection } = useCollections();

  const lastOpenedWriteRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;

      if (lastOpenedWriteRef.current === id) return;
      lastOpenedWriteRef.current = id;

      (async () => {
        try {
          const { error } = await supabase
            .from('workout_links')
            .update({ last_opened_at: new Date().toISOString() })
            .eq('id', id);

          if (error) {
            console.log('[last_opened_at] update failed', error.message);
          }
        } catch (e: unknown) {
          console.log('[last_opened_at] update threw', e instanceof Error ? e.message : e);
        }
      })();

      return () => {
        lastOpenedWriteRef.current = null;
      };
    }, [id])
  );

  const [workout, setWorkout] = useState<WorkoutLinkWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resolvedThumb, setResolvedThumb] = useState<string | null>(null);
  const [thumbLoadFailed, setThumbLoadFailed] = useState(false);
  const thumbRefreshAttemptedRef = useRef(false);
  const [showCollections, setShowCollections] = useState(false);
  const [workoutCollectionIds, setWorkoutCollectionIds] = useState<Set<string>>(new Set());

  const fetchWorkout = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('workout_links')
      .select('*, workout_link_tags(tag_id, tags(*))')
      .eq('id', id)
      .single();
    if (error || !data) {
      Alert.alert('Error', 'Workout not found.');
      router.back();
      return;
    }
    const tags = (data.workout_link_tags ?? []).map((wlt: any) => wlt.tags).filter(Boolean);
    const { workout_link_tags: _, ...rest } = data;
    setWorkout({ ...rest, tags } as WorkoutLinkWithTags);
    setResolvedThumb(null);
    setThumbLoadFailed(false);
    thumbRefreshAttemptedRef.current = false;
    setLoading(false);
  }, [id, router]);

  const fetchWorkoutCollections = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('collection_items')
      .select('collection_id')
      .eq('workout_link_id', id);
    setWorkoutCollectionIds(new Set((data ?? []).map((d: any) => d.collection_id)));
  }, [id]);

  useEffect(() => {
    fetchWorkout();
    fetchCollections();
    fetchWorkoutCollections();
  }, [fetchWorkout, fetchCollections, fetchWorkoutCollections]);

  if (loading || !workout) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const handleOpen = async () => {
    await markOpened(workout.id);
    await WebBrowser.openBrowserAsync(workout.url);
  };

  const handleFavorite = async () => {
    await toggleFavorite(workout.id, workout.is_favorite);
    setWorkout((prev) => (prev ? { ...prev, is_favorite: !prev.is_favorite } : prev));
  };

  const handleDone = async () => {
    await markDone(workout.id);
    Alert.alert('Done!', 'Marked as completed.');
  };

  const handleDelete = () => {
    Alert.alert('Delete Workout', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (isDeleting) return;
          setIsDeleting(true);
          try {
            await deleteWorkout(workout.id);
            removeWorkoutLink(workout.id);
            router.back();
          } catch (err: any) {
            Alert.alert(
              'Delete Failed',
              err?.message ?? 'Could not delete workout. Please try again.',
            );
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const toggleCollection = async (collectionId: string) => {
    if (workoutCollectionIds.has(collectionId)) {
      await removeFromCollection(collectionId, workout.id);
      setWorkoutCollectionIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    } else {
      await addToCollection(collectionId, workout.id);
      setWorkoutCollectionIds((prev) => new Set(prev).add(collectionId));
    }
  };

  const displayThumbDetail = resolvedThumb ?? workout.thumbnail_url;
  const detailThumbSource = displayThumbDetail ? thumbnailImageSource(displayThumbDetail) : null;

  const handleDetailThumbError = () => {
    if (!thumbRefreshAttemptedRef.current && workout.url?.trim()) {
      thumbRefreshAttemptedRef.current = true;
      void (async () => {
        try {
          const meta = await fetchUrlMetadata(workout.url);
          const next = meta.thumbnail_url;
          const prev = resolvedThumb ?? workout.thumbnail_url;
          if (next && next !== prev) {
            setResolvedThumb(next);
            await updateWorkout(workout.id, { thumbnail_url: next });
            setWorkout((prevW) => (prevW ? { ...prevW, thumbnail_url: next } : prevW));
            setThumbLoadFailed(false);
            return;
          }
        } catch {
          // fall through
        }
        setThumbLoadFailed(true);
      })();
      return;
    }
    setThumbLoadFailed(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/edit/${workout.id}`)}>
            <Ionicons name="pencil" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={{ opacity: isDeleting ? 0.5 : 1 }}
          >
            <Ionicons name="trash-outline" size={22} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body}>
        {/* Thumbnail */}
        {detailThumbSource && !thumbLoadFailed ? (
          <Image source={detailThumbSource} style={styles.thumbnail} onError={handleDetailThumbError} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumb]}>
            <Ionicons name="barbell-outline" size={48} color={Colors.textMuted} />
          </View>
        )}

        {/* Title & Domain */}
        <Text style={styles.title}>{workout.title || 'Untitled Workout'}</Text>
        <Text style={styles.domain}>{workout.source_domain}</Text>

        {/* Duration */}
        {workout.duration_minutes != null && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.metaText}>{workout.duration_minutes} min</Text>
          </View>
        )}

        {/* Tags */}
        {workout.tags.length > 0 && (
          <View style={styles.tags}>
            {workout.tags.map((tag) => (
              <Chip key={tag.id} label={tag.name} small />
            ))}
          </View>
        )}

        {/* Notes */}
        {workout.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notes}>{workout.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpen}>
            <Ionicons name="open-outline" size={20} color={Colors.text} />
            <Text style={styles.primaryBtnText}>Open Workout</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleFavorite}>
              <Ionicons
                name={workout.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={workout.is_favorite ? Colors.favorite : Colors.textSecondary}
              />
              <Text style={styles.actionBtnText}>
                {workout.is_favorite ? 'Favorited' : 'Favorite'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowCollections(!showCollections)}
            >
              <Ionicons name="folder-outline" size={24} color={Colors.textSecondary} />
              <Text style={styles.actionBtnText}>Collection</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleDone}>
              <Ionicons name="checkmark-circle-outline" size={24} color={Colors.success} />
              <Text style={styles.actionBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Collection Picker */}
        {showCollections && (
          <View style={styles.collectionPicker}>
            <Text style={styles.sectionLabel}>Add to Collection</Text>
            {collections.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.collectionRow}
                onPress={() => toggleCollection(c.id)}
              >
                <Ionicons
                  name={workoutCollectionIds.has(c.id) ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={Colors.primary}
                />
                <Text style={styles.collectionName}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  body: {
    paddingHorizontal: Spacing.md,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
  },
  placeholderThumb: {
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  domain: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  metaText: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  notesSection: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  notes: {
    color: Colors.text,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.lg,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryBtnText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  collectionPicker: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  collectionName: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
});
