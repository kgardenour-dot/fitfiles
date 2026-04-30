import { useMemo } from 'react';
import { Platform } from 'react-native';
import { UserProfile } from '../types/database';
import { PLAN_LIMITS } from '../constants/limits';
import { BETA_DISABLE_PAYWALL } from '../config/flags';
import { usePurchases } from '../contexts/PurchasesContext';

const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * On iOS/Android, Pro must come from StoreKit via RevenueCat when the SDK is configured (`hasApiKey`).
 * Granting Pro from Supabase `plan_tier` without an active RevenueCat entitlement would unlock paid
 * features for purchases made outside IAP (Guideline 3.1.1). Non-native builds still use `plan_tier`.
 * If the native app ships without RevenueCat keys, tier stays free until IAP is available.
 */
export function useEntitlements(profile: UserProfile | null) {
  const { hasPro: revenueCatPro, hasApiKey } = usePurchases();
  const tier = BETA_DISABLE_PAYWALL
    ? 'pro'
    : !isNativeMobile
      ? revenueCatPro
        ? 'pro'
        : (profile?.plan_tier ?? 'free')
      : !hasApiKey
        ? 'free'
        : revenueCatPro
          ? 'pro'
          : 'free';
  const limits = PLAN_LIMITS[tier];

  const isPro = tier === 'pro';

  const canSaveWorkout = useMemo(
    () => (currentCount: number) => currentCount < limits.maxWorkouts,
    [limits.maxWorkouts],
  );

  const canCreateCollection = useMemo(
    () => (currentCount: number) => currentCount < limits.maxCollections,
    [limits.maxCollections],
  );

  return { tier, isPro, limits, canSaveWorkout, canCreateCollection };
}
