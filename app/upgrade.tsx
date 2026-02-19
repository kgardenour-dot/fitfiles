import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { PLAN_LIMITS, PLAN_PRICING } from '../src/constants/limits';
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Ionicons name="rocket" size={56} color={Colors.primary} />
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Upgrade to save more workouts and collections</Text>

        {/* Plus tier */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Plus</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>POPULAR</Text>
            </View>
          </View>
          <Text style={styles.planLimits}>
            {PLAN_LIMITS.plus.maxWorkouts} workouts · {PLAN_LIMITS.plus.maxCollections} collections
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${PLAN_PRICING.plus.monthly}/mo</Text>
            <Text style={styles.priceDivider}>or</Text>
            <Text style={styles.priceYearly}>${PLAN_PRICING.plus.yearly}/yr</Text>
          </View>
          <View style={styles.features}>
            {['50 saved workouts', '10 collections', 'All current features'].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.planBtn, styles.planBtnPlus]}
            onPress={() => {
              // Placeholder — will integrate RevenueCat or Stripe later
              router.back();
            }}
          >
            <Text style={styles.planBtnText}>Coming Soon</Text>
          </TouchableOpacity>
        </View>

        {/* Pro tier */}
        <View style={[styles.planCard, styles.planCardPro]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Pro</Text>
          </View>
          <Text style={styles.planLimits}>Unlimited workouts · Unlimited collections</Text>
          <Text style={styles.price}>${PLAN_PRICING.pro.yearly}/yr</Text>
          <View style={styles.features}>
            {['Unlimited saved workouts', 'Unlimited collections', 'Priority support', 'Early access to new features'].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.planBtn, styles.planBtnPro]}
            onPress={() => {
              // Placeholder — will integrate RevenueCat or Stripe later
              router.back();
            }}
          >
            <Text style={styles.planBtnText}>Coming Soon</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Subscriptions will be available in a future update.
        </Text>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planCardPro: {
    borderColor: Colors.sunriseYellow + '60',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  planName: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  planBadge: {
    backgroundColor: Colors.coralPulse,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  planLimits: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  price: {
    color: Colors.aquaMint,
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  priceDivider: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  priceYearly: {
    color: Colors.aquaMint,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  features: {
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  featureText: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
  planBtn: {
    borderRadius: BorderRadius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBtnPlus: {
    backgroundColor: Colors.coralPulse,
  },
  planBtnPro: {
    backgroundColor: Colors.sunriseYellow,
  },
  planBtnText: {
    color: '#FFFFFF',
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
