import Purchases, { type PurchasesPackage } from 'react-native-purchases';

/** Short label for paywall buttons (e.g. "per month"). */
export function packageBillingLabel(pkg: PurchasesPackage): string {
  const t = Purchases.PACKAGE_TYPE;
  switch (pkg.packageType) {
    case t.MONTHLY:
      return 'per month';
    case t.ANNUAL:
      return 'per year';
    case t.WEEKLY:
      return 'per week';
    case t.TWO_MONTH:
      return 'per 2 months';
    case t.THREE_MONTH:
      return 'per quarter';
    case t.SIX_MONTH:
      return 'per 6 months';
    case t.LIFETIME:
      return 'one-time';
    default:
      return '';
  }
}
