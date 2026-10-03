import Purchases, { CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat public API key - user adds this in Expo env vars
// EXPO_PUBLIC_REVENUECAT_API_KEY=goog_...
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';

export const ENTITLEMENT_ID = 'premium';

let isConfigured = false;

export async function configureRevenueCat(userId?: string) {
  if (isConfigured) return;
  if (!API_KEY) {
    console.warn('RevenueCat API key not set');
    return;
  }

  try {
    Purchases.configure({ apiKey: API_KEY, appUserID: userId });
    isConfigured = true;
  } catch (e) {
    console.error('RevenueCat configure failed:', e);
  }
}

export async function isPremium(): Promise<boolean> {
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.error('Failed to check premium status:', e);
    return false;
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.error('Failed to get offerings:', e);
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e: any) {
    if (e.userCancelled) {
      return false;
    }
    console.error('Purchase failed:', e);
    throw e;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (e) {
    console.error('Restore failed:', e);
    return false;
  }
}
