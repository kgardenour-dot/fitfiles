import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  PurchasesPackage,
  PurchasesOfferings,
  type PurchasesError,
} from 'react-native-purchases';
import { supabase } from '../lib/supabase';
import { hasProEntitlement } from '../config/revenuecat';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

function getApiKey(): string | undefined {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  return Platform.OS === 'ios' ? ios : android;
}

export type PurchasesContextValue = {
  isConfigured: boolean;
  hasApiKey: boolean;
  customerInfo: CustomerInfo | null;
  hasPro: boolean;
  refreshCustomerInfo: () => Promise<void>;
  restorePurchases: () => Promise<CustomerInfo | null>;
  getOfferings: () => Promise<PurchasesOfferings | null>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
};

const defaultValue: PurchasesContextValue = {
  isConfigured: false,
  hasApiKey: false,
  customerInfo: null,
  hasPro: false,
  refreshCustomerInfo: async () => {},
  restorePurchases: async () => null,
  getOfferings: async () => null,
  purchasePackage: async () => null,
};

const PurchasesContext = createContext<PurchasesContextValue>(defaultValue);

export function PurchasesProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState(!isNative);
  const [hasApiKey, setHasApiKey] = useState(false);
  const configureStarted = useRef(false);
  const lastLoggedInUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isNative || configureStarted.current) return;
    configureStarted.current = true;
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn(
        '[RevenueCat] Add EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
      );
      setIsConfigured(true);
      setHasApiKey(false);
      return;
    }
    try {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
      Purchases.configure({ apiKey });
      setHasApiKey(true);
    } catch (e) {
      console.warn('[RevenueCat] configure failed', e);
      setHasApiKey(false);
    } finally {
      setIsConfigured(true);
    }
  }, []);

  useEffect(() => {
    if (!isNative || !isConfigured || !hasApiKey) return;

    let cancelled = false;

    (async () => {
      try {
        if (userId) {
          const { customerInfo: ci } = await Purchases.logIn(userId);
          lastLoggedInUserId.current = userId;
          if (!cancelled) setCustomerInfo(ci);
        } else if (lastLoggedInUserId.current) {
          const ci = await Purchases.logOut();
          lastLoggedInUserId.current = null;
          if (!cancelled) setCustomerInfo(ci);
        }
      } catch (e) {
        console.warn('[RevenueCat] login/logout', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, isConfigured, hasApiKey]);

  useEffect(() => {
    if (!isNative || !isConfigured || !hasApiKey) return;

    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [isConfigured, hasApiKey]);

  useEffect(() => {
    if (!userId || !customerInfo || !hasApiKey) return;
    const pro = hasProEntitlement(customerInfo);
    supabase
      .from('user_profiles')
      .update({ plan_tier: pro ? 'pro' : 'free' })
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) console.warn('[RevenueCat] plan_tier sync', error.message);
      });
  }, [userId, customerInfo, hasApiKey]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!isNative || !isConfigured || !hasApiKey) return;
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (e) {
      console.warn('[RevenueCat] getCustomerInfo', e);
    }
  }, [isConfigured, hasApiKey]);

  const restorePurchases = useCallback(async () => {
    if (!isNative || !isConfigured || !hasApiKey) return null;
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return info;
    } catch (e) {
      console.warn('[RevenueCat] restorePurchases', e);
      return null;
    }
  }, [isConfigured, hasApiKey]);

  const getOfferings = useCallback(async () => {
    if (!isNative || !isConfigured || !hasApiKey) return null;
    try {
      return await Purchases.getOfferings();
    } catch (e) {
      console.warn('[RevenueCat] getOfferings', e);
      return null;
    }
  }, [isConfigured, hasApiKey]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      if (!isNative || !isConfigured || !hasApiKey) return null;
      try {
        const { customerInfo: ci } = await Purchases.purchasePackage(pkg);
        setCustomerInfo(ci);
        return ci;
      } catch (e) {
        const pe = e as PurchasesError;
        if (pe?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          return null;
        }
        throw e;
      }
    },
    [isConfigured, hasApiKey],
  );

  const hasPro = hasProEntitlement(customerInfo);

  const value = useMemo(
    (): PurchasesContextValue => ({
      isConfigured,
      hasApiKey,
      customerInfo,
      hasPro,
      refreshCustomerInfo,
      restorePurchases,
      getOfferings,
      purchasePackage,
    }),
    [
      isConfigured,
      hasApiKey,
      customerInfo,
      hasPro,
      refreshCustomerInfo,
      restorePurchases,
      getOfferings,
      purchasePackage,
    ],
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases(): PurchasesContextValue {
  return useContext(PurchasesContext);
}
