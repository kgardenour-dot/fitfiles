export const LEGAL_UPDATED = 'September 8, 2026';

export const APPLE_STANDARD_EULA_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export type LegalDoc = {
  title: string;
  sections: { heading: string; body: string }[];
};

export const PRIVACY_POLICY: LegalDoc = {
  title: 'Privacy Policy',
  sections: [
    {
      heading: 'Who we are',
      body: 'FitLinks is a personal workout-link library made by Bandit Innovations. This policy describes how the app handles information when you create an account and use FitLinks.',
    },
    {
      heading: 'Information we collect',
      body: 'Account: your email address and an encrypted password managed by our authentication provider (Supabase). Library data: workout URLs you save, titles, notes, tags, collections, favorites, and optional thumbnail images. Usage events: when you open or mark a workout done, stored so we can sort “Recently Opened.” Purchases: if you subscribe to FitLinks Pro, Apple, Google, and RevenueCat process payment. We receive entitlement status (whether Pro is active), not your full card number.',
    },
    {
      heading: 'How we use it',
      body: 'We use this information to run your library, sync it across your devices, enforce free-plan limits, restore purchases, and provide support. We do not sell your personal information. We do not use your workout library for advertising.',
    },
    {
      heading: 'Sharing',
      body: 'We share data with service providers that host the app: Supabase (database, auth, and image storage) and RevenueCat plus Apple or Google (in-app purchases). Shared workout URLs still live on the original sites (YouTube, Instagram, and so on); FitLinks only stores the link and preview metadata you save.',
    },
    {
      heading: 'Retention and deletion',
      body: 'We keep your data while your account is active. You can delete your account in Profile. That permanently removes your workouts, collections, tags, profile, and stored thumbnails. Subscriptions billed by Apple or Google must be cancelled in your store account separately.',
    },
    {
      heading: 'Security',
      body: 'Access to your library is protected by your login and row-level security so other FitLinks users cannot read your rows. No method of transmission is perfectly secure; please use a strong unique password.',
    },
    {
      heading: 'Children',
      body: 'FitLinks is not directed at children under 13, and we do not knowingly collect personal information from children.',
    },
    {
      heading: 'Contact',
      body: 'Questions about this policy or your data: contact Bandit Innovations using the support contact listed on the FitLinks App Store or Google Play listing.',
    },
  ],
};

export const TERMS_OF_USE: LegalDoc = {
  title: 'Terms of Use',
  sections: [
    {
      heading: 'The service',
      body: 'FitLinks lets you save, tag, and organize workout links from around the web. We do not host the workout videos or articles themselves. You are responsible for the URLs you save and for complying with the terms of those third-party sites.',
    },
    {
      heading: 'Accounts',
      body: 'You must provide a valid email and keep your password confidential. You may delete your account at any time from Profile. We may suspend accounts that abuse the service or violate these terms.',
    },
    {
      heading: 'Free and Pro plans',
      body: 'The free plan limits how many workouts and collections you can save. FitLinks Pro removes those limits. Current limits are shown in Profile and on the upgrade screen. Features may change as we improve the app.',
    },
    {
      heading: 'Subscriptions',
      body: 'Pro is sold as an auto-renewing subscription through the Apple App Store or Google Play. Payment is charged to your store account at confirmation. The subscription renews unless you cancel at least 24 hours before the end of the current period. Manage or cancel in your Apple or Google account settings. FitLinks cannot cancel a store subscription for you.',
    },
    {
      heading: 'Apple users',
      body: 'If you subscribe on iOS, Apple’s Standard Licensed Application End User License Agreement also applies to the paid subscription.',
    },
    {
      heading: 'Acceptable use',
      body: 'Do not use FitLinks to store or share unlawful content, to attempt to access another user’s data, or to disrupt the service. Preview thumbnails and titles are fetched from the pages you save; we are not responsible for third-party page content.',
    },
    {
      heading: 'Disclaimer',
      body: 'FitLinks is provided as-is for personal fitness organization. Workout content comes from third parties. Use your own judgment and consult a professional before starting an exercise program. To the extent allowed by law, Bandit Innovations is not liable for indirect or consequential damages arising from use of the app.',
    },
    {
      heading: 'Changes',
      body: 'We may update these terms. Continued use of FitLinks after an update means you accept the revised terms. The date at the top of this document is the latest revision.',
    },
  ],
};
