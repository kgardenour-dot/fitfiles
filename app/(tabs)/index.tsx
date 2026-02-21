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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkouts, SortOption } from '../../src/hooks/useWorkouts';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { SearchBar } from '../../src/components/SearchBar';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { ConfettiDots } from '../../src/components/ConfettiDots';
import { supabase } from '../../src/lib/supabase';
import { WorkoutLinkWithTags } from '../../src/types/database';

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

export default function LibraryScreen() {
  const router = useRouter();
  const { workouts, loading, fetchWorkouts, toggleFavorite } = useWorkouts();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('recent');
  const debouncedQuery = useDebouncedValue(query, 250);

  const [searchResults, setSearchResults] = useState<WorkoutLinkWithTags[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const isSearching = debouncedQuery.trim().length > 0;

  useEffect(() => {
    if (!isSearching) return;

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
        setSearchResults([]);
      } else {
        setSearchResults((data ?? []) as WorkoutLinkWithTags[]);
      }
      setSearchLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, sort, isSearching]);

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
        <Image
          source={require('../../assets/fitlinks_logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
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
                includeFontPadding={false}
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
  },
  headerLogo: {
    width: 280,
    height: 109,
    marginLeft: -Spacing.md,
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
    marginTop: -2,
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
});
