import { useEffect, useMemo, useState } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { customerInfoHasProEntitlement } from '../lib/revenuecat';

export function useRevenueCat() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const listener = (info: CustomerInfo) => {
      if (!cancelled) setCustomerInfo(info);
    };

    const loadCustomerInfo = async (remainingRetries = 6) => {
      if (cancelled) return;
      if (!Purchases.isConfigured()) {
        if (remainingRetries <= 0) {
          if (!cancelled) setLoading(false);
          return;
        }
        setTimeout(() => {
          if (!cancelled) void loadCustomerInfo(remainingRetries - 1);
        }, 300);
        return;
      }
      try {
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) setCustomerInfo(info);
      } catch {
        // Non-blocking: if RevenueCat is unavailable, app falls back to DB tier.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    void loadCustomerInfo();

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const hasProEntitlement = useMemo(
    () => customerInfoHasProEntitlement(customerInfo),
    [customerInfo],
  );

  return { customerInfo, hasProEntitlement, loading };
}
