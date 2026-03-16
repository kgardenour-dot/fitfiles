import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const PRO_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID ?? 'pro';

let configuredAppUserId: string | null | undefined;

function getRevenueCatApiKey(): string | undefined {
  if (Platform.OS === 'ios') return IOS_API_KEY;
  if (Platform.OS === 'android') return ANDROID_API_KEY;
  return undefined;
}

export function getProEntitlementId(): string {
  return PRO_ENTITLEMENT_ID;
}

export async function configureRevenueCat(appUserId: string | null): Promise<boolean> {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return false;

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

    if (!Purchases.isConfigured()) {
      await Purchases.configure({
        apiKey,
        appUserID: appUserId ?? undefined,
      });
      configuredAppUserId = appUserId ?? null;
      return true;
    }

    const normalizedUserId = appUserId ?? null;
    if (configuredAppUserId === normalizedUserId) return true;

    if (normalizedUserId) {
      await Purchases.logIn(normalizedUserId);
    } else {
      await Purchases.logOut();
    }

    configuredAppUserId = normalizedUserId;
    return true;
  } catch (error) {
    console.warn('[FitLinks] RevenueCat init failed', error);
    return false;
  }
}

export function customerInfoHasProEntitlement(customerInfo: CustomerInfo | null | undefined): boolean {
  if (!customerInfo) return false;
  return Boolean(customerInfo.entitlements.active[getProEntitlementId()]);
}
