import { PlanTier } from '../types/database';

export const PLAN_LIMITS: Record<PlanTier, { maxWorkouts: number; maxCollections: number }> = {
  free: { maxWorkouts: 50, maxCollections: 5 },
  pro: { maxWorkouts: Infinity, maxCollections: Infinity },
};
