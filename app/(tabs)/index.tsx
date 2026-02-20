import { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkouts, SortOption } from '../../src/hooks/useWorkouts';
import { useTags } from '../../src/hooks/useTags';
import { WorkoutCard } from '../../src/components/WorkoutCard';
import { SearchBar } from '../../src/components/SearchBar';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { TAG_TYPE_LABELS } from '../../src/constants/tags';
import { TagType } from '../../src/types/database';
import { ConfettiDots } from '../../src/components/ConfettiDots';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'recent', label: 'Recently Added' },
  { key: 'opened', label: 'Recently Opened' },
  { key: 'favorites', label: 'Faves' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const { workouts, loading, fetchWorkouts, toggleFavorite } = useWorkouts();
  const { tags, fetchTags } = useTags();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('recent');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState<TagType | null>(null);

  const reload = useCallback(() => {
    fetchWorkouts({ search, sort, tagIds: [...selectedTags] });
  }, [fetchWorkouts, search, sort, selectedTags]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const tagsByType = tags.reduce<Record<string, typeof tags>>((acc, tag) => {
    (acc[tag.tag_type] ??= []).push(tag);
    return acc;
  }, {});

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
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={showFilters ? Colors.aquaMint : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Sort Chips */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt, i) => {
          const active = sort === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortChip,
                active && styles.sortChipActive,
                i < SORT_OPTIONS.length - 1 && { marginRight: Spacing.sm },
              ]}
              onPress={() => setSort(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tag Filters */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTypes}>
            {Object.entries(TAG_TYPE_LABELS).map(([type, label]) => (
              <Chip
                key={type}
                label={label}
                active={activeFilterType === type}
                onPress={() =>
                  setActiveFilterType(activeFilterType === type ? null : (type as TagType))
                }
                small
              />
            ))}
          </ScrollView>
          {activeFilterType && tagsByType[activeFilterType] && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTags}>
              {tagsByType[activeFilterType].map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  active={selectedTags.has(tag.id)}
                  onPress={() => handleToggleTag(tag.id)}
                  small
                />
              ))}
            </ScrollView>
          )}
          {selectedTags.size > 0 && (
            <TouchableOpacity onPress={() => setSelectedTags(new Set())}>
              <Text style={styles.clearFilters}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Workout List */}
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() => router.push(`/workout/${item.id}`)}
            onFavorite={async () => {
              try {
                await toggleFavorite(item.id, item.is_favorite, sort === 'favorites');
              } catch {
                reload();
              }
            }}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="barbell-outline"
              title="No workouts saved yet"
              subtitle="Tap + to save your first workout link"
            />
          )
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
    width: 180,
    height: 70,
    marginLeft: -Spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: Colors.aquaMint,
    backgroundColor: Colors.surfaceLight,
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  sortChip: {
    flex: 1,
    backgroundColor: 'orange',
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: 'red',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  sortChipActive: {
    backgroundColor: Colors.aquaMint,
    borderColor: Colors.aquaMint,
  },
  sortChipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  sortChipTextActive: {
    color: Colors.background,
  },
  filterPanel: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  filterTypes: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterTags: {
    flexGrow: 0,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  clearFilters: {
    color: Colors.coralPulse,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
