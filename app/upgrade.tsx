import { useCallback, useEffect, useState } from 'react';
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
import { packageBillingLabel } from '../src/utils/revenuecat-ui';

export default function UpgradeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isPro } = useEntitlements(profile);
  const {
    hasApiKey,
    getOfferings,
    purchasePackage,
    restorePurchases,
  } = usePurchases();

  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

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
        Alert.alert('Restored', 'Your purchases were restored.');
        router.back();
      } else {
        Alert.alert('No purchases found', 'There is nothing to restore for this account.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const openManage = () => {
    openManageSubscriptions();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ConfettiDots />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Ionicons name="rocket" size={56} color={Colors.primary} />
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.subtitle}>Unlock unlimited workouts and collections</Text>

        {isPro ? (
          <View style={styles.proBanner}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
            <Text style={styles.proBannerText}>You have an active Pro subscription.</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={openManage} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>Manage subscription</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Free tier */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Free</Text>
            {!isPro ? (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>CURRENT</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.planLimits}>
            {PLAN_LIMITS.free.maxWorkouts} workouts · {PLAN_LIMITS.free.maxCollections} collections
          </Text>
          <View style={styles.features}>
            {[
              `${PLAN_LIMITS.free.maxWorkouts} saved workouts`,
              `${PLAN_LIMITS.free.maxCollections} collections`,
              'All core features',
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.textMuted} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pro — RevenueCat packages */}
        <View style={[styles.planCard, styles.planCardPro]}>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Pro</Text>
            {isPro ? (
              <View style={[styles.planBadge, styles.planBadgePro]}>
                <Text style={styles.planBadgeText}>ACTIVE</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.planLimits}>Unlimited workouts · Unlimited collections</Text>
          <View style={styles.features}>
            {[
              'Unlimited saved workouts',
              'Unlimited collections',
              'Priority support',
              'Early access to new features',
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {!hasApiKey ? (
            <Text style={styles.configHint}>
              Add RevenueCat API keys in your environment (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY /
              EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY) and rebuild the native app.
            </Text>
          ) : loadingOfferings ? (
            <ActivityIndicator style={styles.loader} color={Colors.coralPulse} />
          ) : packages.length === 0 ? (
            <Text style={styles.configHint}>
              No subscription products yet. In RevenueCat, attach products to your offering and ensure the App Store /
              Play Console product IDs match.
            </Text>
          ) : (
            packages.map((pkg) => {
              const product = pkg.product;
              const price = product.priceString;
              const period = packageBillingLabel(pkg);
              const busy = purchasingId === pkg.identifier;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.planBtn, styles.planBtnPro, busy && styles.planBtnDisabled]}
                  onPress={() => onPurchase(pkg)}
                  disabled={busy || isPro}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.planBtnText}>
                      Subscribe — {price}
                      {period ? ` ${period}` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {hasApiKey && Platform.OS !== 'web' ? (
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={onRestore}
            disabled={restoring}
            activeOpacity={0.8}
          >
            {restoring ? (
              <ActivityIndicator color={Colors.textSecondary} />
            ) : (
              <Text style={styles.restoreText}>Restore purchases</Text>
            )}
          </TouchableOpacity>
        ) : null}

        <Text style={styles.note}>
          Subscriptions renew automatically unless cancelled. Manage or cancel in your {Platform.OS === 'android' ? 'Google Play' : 'Apple'} account settings.
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
  proBanner: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.success + '50',
  },
  proBannerText: {
    color: Colors.text,
    fontSize: FontSize.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryBtn: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  secondaryBtnText: {
    color: Colors.aquaMint,
    fontSize: FontSize.md,
    fontWeight: '700',
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
  planBadgePro: {
    backgroundColor: Colors.success,
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
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planBtnPro: {
    backgroundColor: Colors.coralPulse,
  },
  planBtnDisabled: {
    opacity: 0.7,
  },
  planBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  loader: {
    paddingVertical: Spacing.md,
  },
  configHint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  restoreText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  note: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
});
