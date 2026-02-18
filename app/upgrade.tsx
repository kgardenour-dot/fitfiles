import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { ConfettiDots } from '../src/components/ConfettiDots';

export default function UpgradeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Ionicons name="rocket" size={72} color={Colors.primary} />
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>Unlock unlimited workouts and collections</Text>

        <View style={styles.features}>
          {[
            'Unlimited saved workouts',
            'Unlimited collections',
            'Priority support',
            'Early access to new features',
          ].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => {
            // Placeholder — will integrate RevenueCat or Stripe later
            router.back();
          }}
        >
          <Text style={styles.upgradeBtnText}>Coming Soon</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Subscriptions will be available in a future update.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  features: {
    marginTop: Spacing.xl,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  featureText: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  upgradeBtn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  upgradeBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  note: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
