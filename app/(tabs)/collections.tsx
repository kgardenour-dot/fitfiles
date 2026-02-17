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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollections } from '../../src/hooks/useCollections';
import { useAuth } from '../../src/hooks/useAuth';
import { useEntitlements } from '../../src/hooks/useEntitlements';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';

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
    try {
      await createCollection(name);
      setNewName('');
      setShowCreate(false);
      fetchCollections();
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.aquaMint} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.createBtn}>
            <Ionicons name="close-circle" size={28} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const iconColor = FOLDER_COLORS[index % FOLDER_COLORS.length];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/collection/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name="folder" size={28} color={iconColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardCount}>
                  {item.workout_count} workout{item.workout_count !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id, item.name)}
                hitSlop={12}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="folder-open-outline"
              title="No collections yet"
              subtitle="Create a collection to organize your workouts"
            />
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
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
