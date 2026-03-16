import { useMemo } from 'react';
import { UserProfile } from '../types/database';
import { PLAN_LIMITS } from '../constants/limits';
import { BETA_DISABLE_PAYWALL } from '../config/flags';
import { useRevenueCat } from './useRevenueCat';

export function useEntitlements(profile: UserProfile | null) {
  const { hasProEntitlement } = useRevenueCat();
  const tier = BETA_DISABLE_PAYWALL
    ? 'pro'
    : (hasProEntitlement ? 'pro' : (profile?.plan_tier ?? 'free'));
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
