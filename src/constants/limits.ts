import { PlanTier } from '../types/database';

export const PLAN_LIMITS: Record<PlanTier, { maxWorkouts: number; maxCollections: number }> = {
  free: { maxWorkouts: 25, maxCollections: 5 },
  pro: { maxWorkouts: Infinity, maxCollections: Infinity },
};

export const PLAN_PRICING = {
  pro: {
    monthly: 2.49,
    yearly: 19.99,
  },
} as const;
