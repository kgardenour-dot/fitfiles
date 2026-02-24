import { useMemo } from 'react';
import { UserProfile } from '../types/database';
import { PLAN_LIMITS } from '../constants/limits';

export function useEntitlements(profile: UserProfile | null) {
  const tier = profile?.plan_tier === 'pro' ? 'pro' : 'free';
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
