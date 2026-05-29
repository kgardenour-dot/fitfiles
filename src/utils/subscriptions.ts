import { Linking, Platform } from 'react-native';

export function manageSubscriptionsUrl(): string {
  if (Platform.OS === 'android') {
    return 'https://play.google.com/store/account/subscriptions';
  }
  return 'https://apps.apple.com/account/subscriptions';
}

export function openManageSubscriptions(): void {
  Linking.openURL(manageSubscriptionsUrl());
}
