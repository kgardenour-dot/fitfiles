import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Image,
  Text,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useWorkouts, SortOption } from '../../src/hooks/useWorkouts';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { SearchBar } from '../../src/components/SearchBar';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { ConfettiDots } from '../../src/components/ConfettiDots';
import { supabase } from '../../src/lib/supabase';
import { WorkoutLinkWithTags } from '../../src/types/database';

const SAVE_TUTORIAL_SEEN_KEY = 'fitlinks_save_link_tutorial_seen_v1';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'recent', label: 'Newest' },
  { key: 'opened', label: 'Recently Opened' },
  { key: 'favorites', label: 'Faves' },
];

function filterWorkoutsLocally(workouts: WorkoutLinkWithTags[], query: string): WorkoutLinkWithTags[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return workouts;

  return workouts.filter((workout) => {
    const fields = [
      workout.title ?? '',
      workout.notes ?? '',
      workout.source_domain ?? '',
      workout.url ?? '',
      ...(workout.tags ?? []).map((tag) => tag.name ?? ''),
    ];
    return fields.some((value) => value.toLowerCase().includes(normalized));
  });
}

function normalizeSearchResults(data: unknown): WorkoutLinkWithTags[] {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const tags = (Array.isArray(row.tags) ? row.tags : []).filter(
      (tag): tag is WorkoutLinkWithTags['tags'][number] => Boolean(tag && typeof tag === 'object'),
    );
    return {
      id: typeof row.id === 'string' ? row.id : '',
      user_id: typeof row.user_id === 'string' ? row.user_id : '',
      url: typeof row.url === 'string' ? row.url : '',
      title: typeof row.title === 'string' ? row.title : '',
      source_domain: typeof row.source_domain === 'string' ? row.source_domain : '',
      thumbnail_url: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
      notes: typeof row.notes === 'string' ? row.notes : null,
      duration_minutes:
        typeof row.duration_minutes === 'number' ? row.duration_minutes : null,
      is_favorite: Boolean(row.is_favorite),
      created_at: typeof row.created_at === 'string' ? row.created_at : '',
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
      last_opened_at:
        typeof row.last_opened_at === 'string' ? row.last_opened_at : null,
      tags,
    };
  });
}

export default function LibraryScreen() {
  const router = useRouter();
  const { workouts, loading, fetchWorkouts, toggleFavorite } = useWorkouts();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('recent');
  const debouncedQuery = useDebouncedValue(query, 250);

  const [searchResults, setSearchResults] = useState<WorkoutLinkWithTags[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSaveTutorial, setShowSaveTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);

  const isSearching = debouncedQuery.trim().length > 0;

  useEffect(() => {
    if (!isSearching) {
      setSearchLoading(false);
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    setSearchResults([]);
    setSearchLoading(true);

    (async () => {
      const { data, error } = await supabase.rpc('search_workout_links', {
        p_query: debouncedQuery.trim(),
        p_sort: sort,
        p_limit: 50,
        p_offset: 0,
      });

      if (cancelled) return;

      if (error) {
        console.log('[search_workout_links] error', error.message);
        // Keep search usable even if RPC isn't available in this environment.
        setSearchResults(filterWorkoutsLocally(workouts, debouncedQuery));
      } else {
        setSearchResults(normalizeSearchResults(data));
      }
      setSearchLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, sort, isSearching, workouts]);

  useEffect(() => {
    if (tutorialChecked || loading || isSearching) return;

    let cancelled = false;
    (async () => {
      const seen = await SecureStore.getItemAsync(SAVE_TUTORIAL_SEEN_KEY);
      if (cancelled) return;
      if (seen === '1') {
        setTutorialChecked(true);
        return;
      }
      setShowSaveTutorial(true);
      setTutorialChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [tutorialChecked, loading, isSearching]);

  const dismissSaveTutorial = useCallback(async () => {
    setShowSaveTutorial(false);
    try {
      await SecureStore.setItemAsync(SAVE_TUTORIAL_SEEN_KEY, '1');
    } catch {
      // Non-blocking: if persistence fails, keep app flow working.
    }
  }, []);

  const startSavingFromTutorial = useCallback(async () => {
    await dismissSaveTutorial();
    router.push('/save');
  }, [dismissSaveTutorial, router]);

  const listData = isSearching ? searchResults : workouts;

  const reload = useCallback(() => {
    fetchWorkouts({ sort });
  }, [fetchWorkouts, sort]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      {/* Header: logo left, add button right */}
      <View style={styles.header}>
        <View style={styles.headerLogoWrap}>
          <Image
            source={require('../../assets/fitlinks_logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/save')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBarFlex}>
            <SearchBar value={query} onChangeText={setQuery} />
          </View>
          {isSearching && searchLoading && (
            <ActivityIndicator size="small" color={Colors.aquaMint} />
          )}
        </View>
      </View>

      {/* Sort Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortRow}
        contentContainerStyle={styles.sortRowContent}
      >
        {SORT_OPTIONS.map((opt) => {
          const isSelected = sort === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortChip, isSelected && styles.sortChipActive]}
              onPress={() => setSort(opt.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.sortChipLabel, isSelected && styles.sortChipLabelActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Workout List */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => router.push(`/workout/${item.id}`)}
            onFavorite={async () => {
              await toggleFavorite(item.id, item.is_favorite);
              if (isSearching) {
                setSearchResults((prev) =>
                  prev.map((w) => (w.id === item.id ? { ...w, is_favorite: !w.is_favorite } : w)),
                );
              } else {
                reload();
              }
            }}
          />
        )}
        ListEmptyComponent={
          (loading && !isSearching) || (isSearching && searchLoading) ? null : listData.length === 0 ? (
            isSearching ? (
              <EmptyState icon="search-outline" title="No results" subtitle="Try a different search term" />
            ) : (
              <EmptyState
                icon="barbell-outline"
                title="No workouts saved yet"
                subtitle="Tap + to save your first workout link"
              />
            )
          ) : null
        }
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={Colors.aquaMint} />}
      />

      <Modal
        visible={showSaveTutorial}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void dismissSaveTutorial();
        }}
      >
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialTitle}>How to save links</Text>
            <Text style={styles.tutorialBody}>
              The easiest way is to share straight from the app you're watching: open the video or post in
              YouTube, TikTok, Facebook, Instagram, and many others, tap Share, then choose FitLinks. The link
              imports in one step.
            </Text>
            <Text style={styles.tutorialBody}>
              Prefer to paste instead? Tap + in the top-right, paste your workout URL, then Save Workout.
            </Text>
            <Text style={styles.tutorialBody}>
              Add a few tags when saving (like Strength, HIIT, Mobility) so searches return faster.
            </Text>

            <TouchableOpacity
              style={styles.tutorialPrimaryBtn}
              onPress={() => {
                void startSavingFromTutorial();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.tutorialPrimaryBtnText}>Save my first link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tutorialSecondaryBtn}
              onPress={() => {
                void dismissSaveTutorial();
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    minHeight: 76,
  },
  headerLogoWrap: {
    width: 232,
    height: 72,
    overflow: 'hidden',
  },
  headerLogo: {
    position: 'absolute',
    width: 312,
    height: 312,
    left: -56,
    top: -112,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.coralPulse,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    shadowColor: Colors.coralPulse,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchRow: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchBarFlex: {
    flex: 1,
  },
  sortRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md + Spacing.xs,
    flexGrow: 0,
    minHeight: 52,
  },
  sortRowContent: {
    flexDirection: 'row',
    flexGrow: 1,
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  sortChip: {
    backgroundColor: Colors.chipBg,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  sortChipActive: {
    backgroundColor: Colors.aquaMint,
    borderColor: Colors.aquaMint,
  },
  sortChipLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  sortChipLabelActive: {
    color: '#0B1220',
    fontWeight: '700',
  },
  list: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
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
