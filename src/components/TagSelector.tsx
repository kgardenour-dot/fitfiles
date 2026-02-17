import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tag, TagType } from '../types/database';
import { TAG_TYPE_LABELS } from '../constants/tags';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { Chip } from './Chip';

interface Props {
  tags: Tag[];
  selectedIds: Set<string>;
  onToggle: (tagId: string) => void;
  onCreateTag?: (name: string, type: TagType) => void;
}

export function TagSelector({ tags, selectedIds, onToggle, onCreateTag }: Props) {
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<TagType>('custom');
  const [showCreate, setShowCreate] = useState(false);

  const tagsByType = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    (acc[tag.tag_type] ??= []).push(tag);
    return acc;
  }, {});

  const handleCreate = () => {
    if (newTagName.trim() && onCreateTag) {
      onCreateTag(newTagName.trim(), newTagType);
      setNewTagName('');
      setShowCreate(false);
    }
  };

  return (
    <View style={styles.container}>
      {Object.entries(TAG_TYPE_LABELS).map(([type, label]) => {
        const typeTags = tagsByType[type];
        if (!typeTags?.length) return null;
        return (
          <View key={type} style={styles.section}>
            <Text style={styles.sectionTitle}>{label}</Text>
            <View style={styles.chips}>
              {typeTags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  active={selectedIds.has(tag.id)}
                  onPress={() => onToggle(tag.id)}
                />
              ))}
            </View>
          </View>
        );
      })}

      {onCreateTag && (
        <View style={styles.section}>
          {showCreate ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="Tag name"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.createBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addBtn}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addBtnText}>Add Custom Tag</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  createInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.sm,
    height: 40,
  },
  createBtn: {
    padding: Spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
  },
});
