import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../src/lib/supabase';
import { WorkoutCard } from '../../../src/components/WorkoutCard';
import { useWorkouts } from '../../../src/hooks/useWorkouts';
import { EmptyState } from '../../../src/components/EmptyState';
import { Collection, WorkoutLinkWithTags } from '../../../src/types/database';
import { Colors, Spacing, FontSize } from '../../../src/constants/theme';
import { ConfettiDots } from '../../../src/components/ConfettiDots';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toggleFavorite } = useWorkouts();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLinkWithTags[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: cData } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();
    if (cData) {
      setCollection(cData as Collection);
    }

    const { data, error } = await supabase
      .from('collection_items')
      .select(
        `
        workout_links (
          id,
          title,
          url,
          thumbnail_url,
          source_domain,
          duration_minutes,
          created_at,
          last_opened_at,
          is_favorite,
          workout_link_tags(tag_id, tags(*))
        )
      `,
      )
      .eq('collection_id', id);

    if (error) {
      setWorkouts([]);
    } else {
      const items =
        (data ?? []).map((row: { workout_links: Record<string, unknown> }) => {
          const wl = row.workout_links;
          if (!wl) return null;
          const tags = ((wl as Record<string, unknown>).workout_link_tags ?? []).map(
            (wlt: { tags?: unknown }) => (wlt as { tags?: unknown }).tags,
          ).filter(Boolean);
          const { workout_link_tags: _, ...rest } = wl as Record<string, unknown>;
          return { ...rest, tags };
        }).filter(Boolean) as WorkoutLinkWithTags[];
      // Sort by created_at descending
      items.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setWorkouts(items);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {collection?.name ?? 'Collection'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() =>
              router.push({
                pathname: '/workout/[id]',
                params: { id: item.id },
              })
            }
            onFavorite={async () => {
              await toggleFavorite(item.id, item.is_favorite);
              fetchData();
            }}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="folder-open-outline"
              title="No workouts in this collection yet"
              subtitle="Add workouts from their detail screen or import new ones"
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchData}
            tintColor={Colors.aquaMint}
          />
        }
      />
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  list: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
