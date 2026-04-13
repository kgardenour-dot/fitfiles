import type { CustomerInfo } from 'react-native-purchases';

/** Must match the entitlement identifier in the RevenueCat dashboard (Entitlements). */
export const REVENUECAT_ENTITLEMENT_PRO =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_PRO?.trim() || 'pro';

export function hasProEntitlement(info: CustomerInfo | null): boolean {
  if (!info) return false;
  const active = info.entitlements?.active;
  if (!active) return false;
  return active[REVENUECAT_ENTITLEMENT_PRO] != null;
}
