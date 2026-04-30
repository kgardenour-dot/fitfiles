import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';
import { PLAN_LIMITS } from '../src/constants/limits';
import { ConfettiDots } from '../src/components/ConfettiDots';
import { useAuth } from '../src/hooks/useAuth';
import { useEntitlements } from '../src/hooks/useEntitlements';
import { usePurchases } from '../src/contexts/PurchasesContext';
import { openManageSubscriptions } from '../src/utils/subscriptions';
import { hasProEntitlement } from '../src/config/revenuecat';
import {
  packageBillingLabel,
  packageDisplayTitle,
  sortPaywallPackages,
  isAnnualPackage,
} from '../src/utils/revenuecat-ui';

const PRO_FEATURES = [
  'Unlimited saved workouts',
  'Unlimited collections',
  'Priority support',
  'Early access to new features',
] as const;

export default function UpgradeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isPro } = useEntitlements(profile);
  const { hasApiKey, getOfferings, purchasePackage, restorePurchases } = usePurchases();

  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const sortedPackages = useMemo(() => sortPaywallPackages(packages), [packages]);

  const loadOfferings = useCallback(async () => {
    if (!hasApiKey) {
      setLoadingOfferings(false);
      setPackages([]);
      return;
    }
    setLoadingOfferings(true);
    try {
      const offerings = await getOfferings();
      const list = offerings?.current?.availablePackages ?? [];
      setPackages(list);
    } finally {
      setLoadingOfferings(false);
    }
  }, [getOfferings, hasApiKey]);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const onPurchase = async (pkg: PurchasesPackage) => {
    setPurchasingId(pkg.identifier);
    try {
      const info = await purchasePackage(pkg);
      if (info) {
        router.back();
      }
    } catch (e) {
      const pe = e as PurchasesError;
      if (pe?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return;
      Alert.alert('Purchase failed', pe?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPurchasingId(null);
    }
  };

  const onRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info && hasProEntitlement(info)) {
        Alert.alert('Welcome back', 'Your Pro subscription is active again.');
        router.back();
      } else {
        Alert.alert('No subscription found', 'We could not find an active subscription for this account.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const showDevConfigHint = !hasApiKey && __DEV__;
  const showUserFacingConfigIssue = !hasApiKey && !__DEV__;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ConfettiDots />
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.topBarBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
        >
          <Ionicons name="close" size={26} color={Colors.text} />
        </TouchableOpacity>
        {hasApiKey && Platform.OS !== 'web' ? (
          <TouchableOpacity
            onPress={onRestore}
            disabled={restoring}
            style={styles.topBarBtn}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            {restoring ? (
              <ActivityIndicator size="small" color={Colors.aquaMint} />
            ) : (
              <Text style={styles.restoreLink}>Restore</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isPro ? (
          <View style={styles.heroPro}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
            </View>
            <Text style={styles.heroTitle}>You are on Pro</Text>
            <Text style={styles.heroSubtitle}>
              Thank you for supporting FitLinks. Manage billing or cancel anytime in your store account.
            </Text>
            <TouchableOpacity style={styles.manageCta} onPress={openManageSubscriptions} activeOpacity={0.85}>
              <Text style={styles.manageCtaText}>Manage subscription</Text>
              <Ionicons name="open-outline" size={18} color="#0B1220" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroIconWrap}>
              <Ionicons name="sparkles" size={32} color={Colors.coralPulse} />
            </View>
            <Text style={styles.heroKicker}>FITLINKS PRO</Text>
            <Text style={styles.heroTitle}>Train without limits</Text>
            <Text style={styles.heroSubtitle}>
              Save every workout link, organize in collections, and grow your library as much as you want.
            </Text>
          </View>
        )}

        {!isPro ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What you get</Text>
              {PRO_FEATURES.map((line) => (
                <View key={line} style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name="checkmark" size={16} color="#0B1220" />
                  </View>
                  <Text style={styles.benefitText}>{line}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.freeFootnote}>
              Free plan includes up to {PLAN_LIMITS.free.maxWorkouts} saved workouts and {PLAN_LIMITS.free.maxCollections}{' '}
              collections. Pro removes these limits.
            </Text>

            <Text style={styles.pickPlanTitle}>Choose your plan</Text>

            {showDevConfigHint ? (
              <Text style={styles.configHint}>
                Development: set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY, then
                rebuild the native app.
              </Text>
            ) : null}
            {showUserFacingConfigIssue ? (
              <Text style={styles.configHint}>Subscriptions are temporarily unavailable. Please try again later.</Text>
            ) : null}

            {hasApiKey && loadingOfferings ? (
              <View style={styles.loadingPlans}>
                <ActivityIndicator size="large" color={Colors.coralPulse} />
                <Text style={styles.loadingPlansText}>Loading plans…</Text>
              </View>
            ) : null}

            {hasApiKey && !loadingOfferings && sortedPackages.length === 0 ? (
              <Text style={styles.configHint}>
                No plans to show yet. Ask the team to attach subscription products to the current offering in RevenueCat.
              </Text>
            ) : null}

            {hasApiKey && !loadingOfferings && sortedPackages.length > 0
              ? sortedPackages.map((pkg) => {
                  const product = pkg.product;
                  const title = packageDisplayTitle(pkg);
                  const period = packageBillingLabel(pkg);
                  const annual = isAnnualPackage(pkg);
                  const busy = purchasingId === pkg.identifier;
                  const intro = product.introPrice;

                  return (
                    <View key={pkg.identifier} style={[styles.planCard, annual && styles.planCardFeatured]}>
                      {annual ? (
                        <View style={styles.bestValuePill}>
                          <Text style={styles.bestValueText}>Best value</Text>
                        </View>
                      ) : null}
                      <View style={styles.planCardHeader}>
                        <Text style={styles.planCardTitle}>{title}</Text>
                        <Text style={styles.planCardPrice}>{product.priceString}</Text>
                        {period ? <Text style={styles.planCardPeriod}>{period}</Text> : null}
                      </View>
                      {intro ? (
                        <Text style={styles.introLine}>Intro offer · {intro.priceString}</Text>
                      ) : null}
                      <TouchableOpacity
                        style={[styles.subscribeBtn, busy && styles.subscribeBtnBusy]}
                        onPress={() => onPurchase(pkg)}
                        disabled={busy}
                        activeOpacity={0.9}
                        accessibilityLabel={`Subscribe to ${title} for ${product.priceString}`}
                      >
                        {busy ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.subscribeBtnText}>Continue with {title}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              : null}
          </>
        ) : null}

        <View style={styles.legalBlock}>
          <Text style={styles.legalTitle}>Subscription details</Text>
          <Text style={styles.legalText}>
            Payment is charged to your {Platform.OS === 'android' ? 'Google Play' : 'Apple'} account. Subscription
            renews automatically until you cancel. Cancel at least 24 hours before renewal to avoid being charged again.
            Manage or cancel in your account settings.
          </Text>
        </View>

        {hasApiKey && Platform.OS !== 'web' && !isPro ? (
          <TouchableOpacity style={styles.restoreFooter} onPress={onRestore} disabled={restoring} activeOpacity={0.8}>
            {restoring ? (
              <ActivityIndicator color={Colors.textMuted} />
            ) : (
              <Text style={styles.restoreFooterText}>Already purchased? Restore</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  topBarBtn: {
    minWidth: 72,
    paddingVertical: Spacing.xs,
  },
  topBarSpacer: {
    width: 72,
  },
  restoreLink: {
    color: Colors.aquaMint,
    fontSize: FontSize.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  hero: {
    position: 'relative',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.sunriseYellow + '35',
    overflow: 'hidden',
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.coralPulse + '08',
  },
  heroIconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.coralPulse + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroKicker: {
    color: Colors.sunriseYellow,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  heroPro: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.success + '40',
    alignItems: 'center',
  },
  manageCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    backgroundColor: Colors.aquaMint,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  manageCtaText: {
    color: '#0B1220',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  benefitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.aquaMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    lineHeight: 22,
    fontWeight: '500',
  },
  freeFootnote: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  pickPlanTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  planCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planCardFeatured: {
    borderWidth: 2,
    borderColor: Colors.sunriseYellow + 'AA',
    backgroundColor: Colors.surface,
  },
  bestValuePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.sunriseYellow + '28',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  bestValueText: {
    color: Colors.sunriseYellow,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planCardHeader: {
    marginBottom: Spacing.md,
  },
  planCardTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  planCardPrice: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  planCardPeriod: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  introLine: {
    color: Colors.aquaMint,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  subscribeBtn: {
    backgroundColor: Colors.coralPulse,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: Colors.coralPulse,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeBtnBusy: {
    opacity: 0.85,
  },
  subscribeBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  loadingPlans: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  loadingPlansText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  configHint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  legalBlock: {
    marginTop: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legalTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  legalText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  restoreFooter: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  restoreFooterText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
