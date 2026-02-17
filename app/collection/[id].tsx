import { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useCollections } from '../../src/hooks/useCollections';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Collection, WorkoutLinkWithTags } from '../../src/types/database';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getCollectionWorkouts, updateCollection, removeFromCollection } = useCollections();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLinkWithTags[]>([]);
  const [loading, setLoading] = useState(true);
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

    const wData = await getCollectionWorkouts(id);
    setWorkouts(wData as WorkoutLinkWithTags[]);
    setLoading(false);
  }, [id, getCollectionWorkouts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRename = async () => {
    if (!collection || !editName.trim()) return;
    await updateCollection(collection.id, editName.trim());
    setCollection((prev) => (prev ? { ...prev, name: editName.trim() } : prev));
    setEditing(false);
  };

  const handleRemove = async (workoutId: string) => {
    if (!id) return;
    await removeFromCollection(id, workoutId);
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              onSubmitEditing={handleRename}
            />
            <TouchableOpacity onPress={handleRename}>
              <Ionicons name="checkmark" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)} style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {collection?.name ?? 'Collection'}
            </Text>
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
              onPress={() => router.push(`/workout/${item.id}`)}
              onFavorite={() => {}}
            />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(item.id)}
            >
              <Text style={styles.removeBtnText}>Remove from collection</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No workouts in this collection"
            subtitle="Add workouts from their detail screen"
          />
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={Colors.primary} />
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
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  list: {
    padding: Spacing.md,
  },
  removeBtn: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  removeBtnText: {
    color: Colors.accent,
    fontSize: FontSize.xs,
  },
});
