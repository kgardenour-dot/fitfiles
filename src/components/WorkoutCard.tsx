import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutLinkWithTags } from '../types/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { Chip } from './Chip';
import { useWorkouts } from '../contexts/WorkoutsContext';
import { fetchUrlMetadata } from '../lib/og-scraper';
import { thumbnailImageSource } from '../lib/thumbnail-image';

interface Props {
  workout: WorkoutLinkWithTags;
  onPress: () => void;
  onFavorite: () => void;
}

export function WorkoutCard({ workout, onPress, onFavorite }: Props) {
  const { updateWorkout } = useWorkouts();
  const [hasThumbnailError, setHasThumbnailError] = useState(false);
  const [resolvedThumb, setResolvedThumb] = useState<string | null>(null);
  const refreshAttemptedRef = useRef(false);

  const displayThumb = resolvedThumb ?? workout.thumbnail_url;

  useEffect(() => {
    setHasThumbnailError(false);
    setResolvedThumb(null);
    refreshAttemptedRef.current = false;
  }, [workout.id, workout.thumbnail_url]);

  const showThumbnail = Boolean(displayThumb) && !hasThumbnailError;

  const thumbSource = displayThumb ? thumbnailImageSource(displayThumb) : null;

  const handleThumbnailError = () => {
    if (!refreshAttemptedRef.current && workout.url?.trim()) {
      refreshAttemptedRef.current = true;
      void (async () => {
        try {
          const meta = await fetchUrlMetadata(workout.url);
          const next = meta.thumbnail_url;
          if (next && next !== displayThumb) {
            setResolvedThumb(next);
            await updateWorkout(workout.id, { thumbnail_url: next });
            setHasThumbnailError(false);
            return;
          }
        } catch {
          // fall through to placeholder
        }
        setHasThumbnailError(true);
      })();
      return;
    }
    setHasThumbnailError(true);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {showThumbnail && thumbSource ? (
        <Image
          source={thumbSource}
          style={styles.thumbnail}
          onError={handleThumbnailError}
        />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumb]}>
          <Ionicons name="barbell-outline" size={32} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {workout.title || 'Untitled Workout'}
          </Text>
          <TouchableOpacity onPress={onFavorite} hitSlop={8}>
            <Ionicons
              name={workout.is_favorite ? 'heart' : 'heart-outline'}
              size={22}
              color={workout.is_favorite ? Colors.favorite : Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.domain} numberOfLines={1}>
          {workout.source_domain}
        </Text>
        {workout.duration_minutes != null && (
          <Text style={styles.duration}>
            {workout.duration_minutes} min
          </Text>
        )}
        {workout.tags.length > 0 && (
          <View style={styles.tags}>
            {workout.tags.slice(0, 4).map((tag) => (
              <Chip key={tag.id} label={tag.name} small />
            ))}
            {workout.tags.length > 4 && (
              <Chip label={`+${workout.tags.length - 4}`} small />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    height: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnail: {
    width: 120,
    height: 120,
  },
  placeholderThumb: {
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  domain: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  duration: {
    color: Colors.aquaMint,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: Spacing.xs,
  },
});
