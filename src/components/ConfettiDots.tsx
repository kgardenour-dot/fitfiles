import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export function ConfettiDots() {
  return (
    <View style={styles.layer} pointerEvents="none">
      {/* Top area */}
      <View style={[styles.dot, styles.dotCoral, { top: 20, left: 30 }]} />
      <View style={[styles.dot, styles.dotAqua, { top: 60, right: 40 }]} />
      <View style={[styles.dot, styles.dotYellow, { top: 10, right: 100 }]} />
      <View style={[styles.dotSmall, styles.dotLavender, { top: 80, left: 60 }]} />
      <View style={[styles.dotSmall, styles.dotOrange, { top: 40, left: 140 }]} />
      <View style={[styles.dotSmall, styles.dotBlue, { top: 25, left: '55%' }]} />
      <View style={[styles.dot, styles.dotMagenta, { top: 70, right: 90 }]} />
      {/* Middle area */}
      <View style={[styles.dotSmall, styles.dotCoral, { top: '35%', left: 15 }]} />
      <View style={[styles.dot, styles.dotLavender, { top: '40%', right: 20 }]} />
      <View style={[styles.dotSmall, styles.dotYellow, { top: '50%', left: 25 }]} />
      <View style={[styles.dot, styles.dotAqua, { top: '55%', right: 15 }]} />
      <View style={[styles.dotSmall, styles.dotOrange, { top: '45%', right: 35 }]} />
      {/* Bottom area */}
      <View style={[styles.dotSmall, styles.dotBlue, { bottom: 100, right: 50 }]} />
      <View style={[styles.dot, styles.dotMagenta, { bottom: 70, left: 40 }]} />
      <View style={[styles.dotSmall, styles.dotAqua, { bottom: 120, left: 120 }]} />
      <View style={[styles.dot, styles.dotYellow, { bottom: 50, right: 80 }]} />
      <View style={[styles.dotSmall, styles.dotCoral, { bottom: 30, left: '50%' }]} />
      <View style={[styles.dot, styles.dotOrange, { bottom: 80, left: 20 }]} />
      <View style={[styles.dotSmall, styles.dotLavender, { bottom: 140, right: 30 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.6,
  },
  dotSmall: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  dotCoral: { backgroundColor: Colors.coralPulse },
  dotAqua: { backgroundColor: Colors.aquaMint },
  dotYellow: { backgroundColor: Colors.sunriseYellow },
  dotLavender: { backgroundColor: Colors.lavender },
  dotOrange: { backgroundColor: Colors.sunsetOrange },
  dotBlue: { backgroundColor: Colors.iceBlue },
  dotMagenta: { backgroundColor: Colors.softMagenta },
});
