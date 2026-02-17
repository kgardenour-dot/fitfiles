import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface Props {
  label: string;
  active?: boolean;
  small?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active = false, small = false, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && styles.chipActive,
        small && styles.chipSmall,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text
        style={[
          styles.label,
          active && styles.labelActive,
          small && styles.labelSmall,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: Colors.chipBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.chipActive,
    borderColor: Colors.primaryLight,
  },
  chipSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  labelActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: FontSize.xs,
  },
});
