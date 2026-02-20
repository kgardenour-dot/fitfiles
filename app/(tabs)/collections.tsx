import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollections } from '../../src/hooks/useCollections';
import { useAuth } from '../../src/hooks/useAuth';
import { useEntitlements } from '../../src/hooks/useEntitlements';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { ConfettiDots } from '../../src/components/ConfettiDots';

const FOLDER_COLORS = [
  Colors.iceBlue,
  Colors.coralPulse,
  Colors.aquaMint,
  Colors.sunriseYellow,
  Colors.lavender,
  Colors.sunsetOrange,
  Colors.softMagenta,
];

export default function CollectionsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { canCreateCollection } = useEntitlements(profile);
  const { collections, loading, fetchCollections, createCollection, deleteCollection } =
    useCollections();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    if (!canCreateCollection(collections.length)) {
      router.push('/upgrade');
      return;
    }
    setCreating(true);
    try {
      await createCollection(name);
      setNewName('');
      setShowCreate(false);
      await fetchCollections();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Collection', `Delete "${name}"? Workouts won't be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCollection(id);
          fetchCollections();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collections</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View style={styles.createRow}>
          <TextInput
            style={styles.createInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Collection name"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            editable={!creating}
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity
            onPress={handleCreate}
            style={styles.createBtn}
            disabled={creating || !newName.trim()}
          >
            {creating ? (
              <ActivityIndicator size="small" color={Colors.aquaMint} />
            ) : (
              <Ionicons name="checkmark-circle" size={28} color={Colors.aquaMint} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.createBtn}>
            <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={collections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const iconColor = FOLDER_COLORS[index % FOLDER_COLORS.length];
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/collection/${item.id}`)}
            >
              <View style={[styles.cardIcon, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name="folder" size={28} color={iconColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCount}>
                  {item.workout_count ?? 0} workout{(item.workout_count ?? 0) === 1 ? '' : 's'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.name)}
                hitSlop={12}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="folder-open-outline"
                title="No collections yet"
                subtitle="Create a collection to organize your workouts"
              />
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => setShowCreate(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyCreateBtnText}>New collection</Text>
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchCollections} tintColor={Colors.aquaMint} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.coralPulse,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.coralPulse,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  createInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  createBtn: {
    padding: 4,
  },
  list: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  cardCount: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.coralPulse,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
