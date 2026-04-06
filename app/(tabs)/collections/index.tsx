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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useCollections } from '../../../src/hooks/useCollections';
import { useAuth } from '../../../src/hooks/useAuth';
import { useEntitlements } from '../../../src/hooks/useEntitlements';
import { EmptyState } from '../../../src/components/EmptyState';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../src/constants/theme';
import { ConfettiDots } from '../../../src/components/ConfettiDots';

const FOLDER_COLORS = [
  Colors.iceBlue,
  Colors.coralPulse,
  Colors.aquaMint,
  Colors.sunriseYellow,
  Colors.lavender,
  Colors.sunsetOrange,
  Colors.softMagenta,
];

const COLLECTIONS_TUTORIAL_SEEN_KEY = 'fitlinks_collections_tutorial_seen_v1';

export default function CollectionsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { canCreateCollection } = useEntitlements(profile);
  const { collections, loading, fetchCollections, createCollection, deleteCollection } =
    useCollections();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCollectionsTutorial, setShowCollectionsTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const listRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      fetchCollections();
    }, [fetchCollections]),
  );

  useEffect(() => {
    if (tutorialChecked || loading) return;

    let cancelled = false;
    (async () => {
      const seen = await SecureStore.getItemAsync(COLLECTIONS_TUTORIAL_SEEN_KEY);
      if (cancelled) return;
      if (seen === '1') {
        setTutorialChecked(true);
        return;
      }
      setShowCollectionsTutorial(true);
      setTutorialChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [tutorialChecked, loading]);

  const dismissCollectionsTutorial = useCallback(async () => {
    setShowCollectionsTutorial(false);
    try {
      await SecureStore.setItemAsync(COLLECTIONS_TUTORIAL_SEEN_KEY, '1');
    } catch {
      // Non-blocking if persistence fails.
    }
  }, []);

  const startCreateFromTutorial = useCallback(async () => {
    await dismissCollectionsTutorial();
    setShowCreate(true);
  }, [dismissCollectionsTutorial]);

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
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create collection');
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
              onPress={() =>
                router.push({
                  pathname: '/collections/[id]',
                  params: { id: item.id },
                })
              }
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

      <Modal
        visible={showCollectionsTutorial}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void dismissCollectionsTutorial();
        }}
      >
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialTitle}>Quick guide: Collections</Text>
            <Text style={styles.tutorialBody}>
              Use collections to group workouts by goal, like Strength, Mobility, or 20-min sessions.
            </Text>
            <Text style={styles.tutorialBody}>
              Tap +, name your collection, then open a saved workout and add it to one or more collections.
            </Text>

            <TouchableOpacity
              style={styles.tutorialPrimaryBtn}
              onPress={() => {
                void startCreateFromTutorial();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.tutorialPrimaryBtnText}>Create collection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tutorialSecondaryBtn}
              onPress={() => {
                void dismissCollectionsTutorial();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.tutorialSecondaryBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.75)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  tutorialCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  tutorialTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  tutorialBody: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  tutorialPrimaryBtn: {
    backgroundColor: Colors.coralPulse,
    borderRadius: BorderRadius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  tutorialPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  tutorialSecondaryBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  tutorialSecondaryBtnText: {
    color: Colors.aquaMint,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
