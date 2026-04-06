import Purchases, { type PurchasesPackage } from 'react-native-purchases';

const t = Purchases.PACKAGE_TYPE;

/** Short label for paywall buttons (e.g. "per month"). */
export function packageBillingLabel(pkg: PurchasesPackage): string {
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

/** Card title (Monthly, Yearly, …). */
export function packageDisplayTitle(pkg: PurchasesPackage): string {
  switch (pkg.packageType) {
    case t.MONTHLY:
      return 'Monthly';
    case t.ANNUAL:
      return 'Yearly';
    case t.WEEKLY:
      return 'Weekly';
    case t.TWO_MONTH:
      return 'Every 2 months';
    case t.THREE_MONTH:
      return 'Every 3 months';
    case t.SIX_MONTH:
      return 'Every 6 months';
    case t.LIFETIME:
      return 'Lifetime';
    default:
      return pkg.product.title?.trim() || 'Pro';
  }
}

export function isAnnualPackage(pkg: PurchasesPackage): boolean {
  return pkg.packageType === t.ANNUAL;
}

/** Annual first (best value), then monthly, then other periods. */
export function sortPaywallPackages(packages: PurchasesPackage[]): PurchasesPackage[] {
  const weight = (p: PurchasesPackage): number => {
    switch (p.packageType) {
      case t.ANNUAL:
        return 0;
      case t.MONTHLY:
        return 1;
      case t.SIX_MONTH:
        return 2;
      case t.THREE_MONTH:
        return 3;
      case t.TWO_MONTH:
        return 4;
      case t.WEEKLY:
        return 5;
      case t.LIFETIME:
        return 6;
      default:
        return 7;
    }
  };
  return [...packages].sort((a, b) => weight(a) - weight(b));
}
