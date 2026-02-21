import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface Props {
  label: string;
  active?: boolean;
  small?: boolean;
  highlighted?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active = false, small = false, highlighted = false, onPress }: Props) {
  const useActiveStyle = active || highlighted;
  const labelColor = useActiveStyle
    ? '#0B1220'
    : 'rgba(255,255,255,0.88)';

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        useActiveStyle && styles.chipActive,
        small && styles.chipSmall,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text
        style={[
          styles.label,
          { color: labelColor },
          useActiveStyle && styles.labelActive,
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
    backgroundColor: Colors.aquaMint,
    borderColor: Colors.aquaMint,
  },
  chipSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  label: {
    fontSize: FontSize.sm,
  },
  labelActive: {
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: FontSize.xs,
  },
});
