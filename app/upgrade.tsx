import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { PLAN_LIMITS, PLAN_PRICING } from '../src/constants/limits';
import { ConfettiDots } from '../src/components/ConfettiDots';
import { useAuth } from '../src/hooks/useAuth';
import { configureRevenueCat } from '../src/lib/revenuecat';

export default function UpgradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [actionLoading, setActionLoading] = useState<'monthly' | 'yearly' | 'restore' | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOfferings = async () => {
      setLoadingOfferings(true);
      try {
        const configured = await configureRevenueCat(user?.id ?? null);
        if (!configured) {
          if (!cancelled) setOffering(null);
          return;
        }
        const offerings = await Purchases.getOfferings();
        if (!cancelled) {
          setOffering(offerings.current ?? null);
        }
      } catch (error) {
        console.warn('[FitLinks] Could not load RevenueCat offerings', error);
        if (!cancelled) setOffering(null);
      } finally {
        if (!cancelled) setLoadingOfferings(false);
      }
    };

    void loadOfferings();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const monthlyPackage = useMemo(() => {
    if (!offering) return null;
    return (
      offering.monthly ??
      offering.availablePackages.find((pkg) => pkg.packageType === 'MONTHLY') ??
      null
    );
  }, [offering]);

  const yearlyPackage = useMemo(() => {
    if (!offering) return null;
    return (
      offering.annual ??
      offering.availablePackages.find((pkg) => pkg.packageType === 'ANNUAL') ??
      null
    );
  }, [offering]);

  const handlePurchase = async (pkg: PurchasesPackage, purchaseType: 'monthly' | 'yearly') => {
    setActionLoading(purchaseType);
    try {
      await Purchases.purchasePackage(pkg);
      Alert.alert('Upgrade successful', 'Your Pro access is active.');
      router.back();
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'userCancelled' in error && (error as { userCancelled?: boolean }).userCancelled) {
        return;
      }
      const message = error instanceof Error ? error.message : 'Unable to complete purchase right now.';
      Alert.alert('Purchase failed', message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestorePurchases = async () => {
    setActionLoading('restore');
    try {
      await Purchases.restorePurchases();
      Alert.alert('Restore complete', 'If you had an active subscription, Pro has been restored.');
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to restore purchases right now.';
      Alert.alert('Restore failed', message);
    } finally {
      setActionLoading(null);
    }
  };

  const canPurchase = !loadingOfferings && Boolean(monthlyPackage || yearlyPackage);

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
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>Unlock unlimited workouts and collections</Text>

        {/* Free tier */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Free</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>CURRENT</Text>
            </View>
          </View>
          <Text style={styles.planLimits}>
            {PLAN_LIMITS.free.maxWorkouts} workouts · {PLAN_LIMITS.free.maxCollections} collections
          </Text>
          <View style={styles.features}>
            {[`${PLAN_LIMITS.free.maxWorkouts} saved workouts`, `${PLAN_LIMITS.free.maxCollections} collections`, 'All core features'].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.textMuted} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pro tier */}
        <View style={[styles.planCard, styles.planCardPro]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Pro</Text>
          </View>
          <Text style={styles.planLimits}>Unlimited workouts · Unlimited collections</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {monthlyPackage?.product.priceString ?? `$${PLAN_PRICING.pro.monthly}`}/mo
            </Text>
            <Text style={styles.priceDivider}>or</Text>
            <Text style={styles.priceYearly}>
              {yearlyPackage?.product.priceString ?? `$${PLAN_PRICING.pro.yearly}`}/yr
            </Text>
          </View>
          <View style={styles.features}>
            {['Unlimited saved workouts', 'Unlimited collections', 'Priority support', 'Early access to new features'].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {loadingOfferings ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.aquaMint} />
              <Text style={styles.loadingText}>Loading subscription options...</Text>
            </View>
          ) : (
            <>
              {monthlyPackage ? (
                <TouchableOpacity
                  style={[styles.planBtn, styles.planBtnPro]}
                  onPress={() => {
                    void handlePurchase(monthlyPackage, 'monthly');
                  }}
                  disabled={actionLoading !== null}
                >
                  <Text style={styles.planBtnText}>
                    {actionLoading === 'monthly' ? 'Processing...' : 'Start Monthly Plan'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {yearlyPackage ? (
                <TouchableOpacity
                  style={[styles.planBtn, styles.planBtnOutline]}
                  onPress={() => {
                    void handlePurchase(yearlyPackage, 'yearly');
                  }}
                  disabled={actionLoading !== null}
                >
                  <Text style={[styles.planBtnText, styles.planBtnOutlineText]}>
                    {actionLoading === 'yearly' ? 'Processing...' : 'Start Annual Plan'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={() => {
                  void handleRestorePurchases();
                }}
                disabled={actionLoading !== null}
              >
                <Text style={styles.restoreBtnText}>
                  {actionLoading === 'restore' ? 'Restoring...' : 'Restore Purchases'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.note}>
          {canPurchase
            ? 'Subscriptions are managed through your App Store or Google Play account.'
            : 'Subscriptions are not configured for this build yet. Add RevenueCat API keys in env and EAS.'}
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
    backgroundColor: Colors.textMuted,
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
    marginTop: Spacing.sm,
  },
  planBtnPro: {
    backgroundColor: Colors.coralPulse,
  },
  planBtnOutline: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.aquaMint,
  },
  planBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  planBtnOutlineText: {
    color: Colors.aquaMint,
  },
  restoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginTop: Spacing.sm,
  },
  restoreBtnText: {
    color: Colors.aquaMint,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  loadingRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  note: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
