import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../src/lib/supabase';
import { WorkoutCard } from '../../../src/components/WorkoutCard';
import { useWorkouts } from '../../../src/hooks/useWorkouts';
import { useCollections } from '../../../src/hooks/useCollections';
import { EmptyState } from '../../../src/components/EmptyState';
import { Collection, WorkoutLinkWithTags } from '../../../src/types/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import { ConfettiDots } from '../../../src/components/ConfettiDots';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toggleFavorite } = useWorkouts();
  const { updateCollection, removeFromCollection } = useCollections();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLinkWithTags[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

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
      setEditName(cData.name);
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
      const items = (data ?? [])
        .map((row) => {
          const relation = (row as { workout_links?: unknown }).workout_links;
          const wl = Array.isArray(relation) ? relation[0] : relation;
          if (!wl || typeof wl !== 'object') return null;

          const wlRecord = wl as Record<string, unknown>;
          const rawTagLinks = Array.isArray(wlRecord.workout_link_tags)
            ? wlRecord.workout_link_tags
            : [];
          const tags = rawTagLinks.flatMap((wlt) => {
            const linked = (wlt as { tags?: unknown }).tags;
            if (Array.isArray(linked)) return linked;
            return linked ? [linked] : [];
          }) as WorkoutLinkWithTags['tags'];

          const { workout_link_tags: _, ...rest } = wlRecord;
          return { ...rest, tags } as WorkoutLinkWithTags;
        })
        .filter((item): item is WorkoutLinkWithTags => Boolean(item));
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

  const handleRename = async () => {
    if (!collection || !editName.trim()) return;
    try {
      await updateCollection(collection.id, editName.trim());
      setCollection((prev) => (prev ? { ...prev, name: editName.trim() } : prev));
      setEditing(false);
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not rename collection');
    }
  };

  const handleRemove = (workoutId: string, title: string) => {
    if (!id) return;
    Alert.alert('Remove workout', `Remove "${title}" from this collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFromCollection(id, workoutId);
            setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not remove workout');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              onSubmitEditing={() => {
                void handleRename();
              }}
              placeholder="Collection name"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity
              onPress={() => {
                void handleRename();
              }}
              hitSlop={8}
            >
              <Ionicons name="checkmark" size={24} color={Colors.aquaMint} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditName(collection?.name ?? '');
                setEditing(false);
              }}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.titleTap} activeOpacity={0.7}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {collection?.name ?? 'Collection'}
            </Text>
            <Ionicons name="pencil" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View>
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
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item.id, item.title || 'this workout')}
            >
              <Text style={styles.removeBtnText}>Remove from collection</Text>
            </TouchableOpacity>
          </View>
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
  titleTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  list: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  removeBtn: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  removeBtnText: {
    color: Colors.aquaMint,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
