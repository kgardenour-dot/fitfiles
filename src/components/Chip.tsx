import { Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface Props {
  label: string;
  active?: boolean;
  small?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, active = false, small = false, onPress, style }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && styles.chipActive,
        small && styles.chipSmall,
        style,
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
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
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
    marginRight: Spacing.sm,
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
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  labelActive: {
    color: Colors.background,
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: FontSize.xs,
  },
});
