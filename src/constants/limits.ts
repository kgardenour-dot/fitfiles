import { PlanTier } from '../types/database';

export const PLAN_LIMITS: Record<PlanTier, { maxWorkouts: number; maxCollections: number }> = {
  free: { maxWorkouts: 10, maxCollections: 3 },
  plus: { maxWorkouts: 50, maxCollections: 10 },
  pro: { maxWorkouts: Infinity, maxCollections: Infinity },
};

export const PLAN_PRICING = {
  plus: {
    monthly: 2.99,
    yearly: 29.99,
  },
  pro: {
    yearly: 49.99,
  },
} as const;
