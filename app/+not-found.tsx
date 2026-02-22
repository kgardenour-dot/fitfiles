import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Colors } from '../src/constants/theme';
import { getLastShareHandledAtMs } from '../src/utils/shareNavState';

export default function NotFoundScreen() {
  const hasRedirectedRef = useRef(false);
  const [ignoreDueToShare, setIgnoreDueToShare] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (hasRedirectedRef.current) return;
    const currentPath = String(pathname ?? '');
    const hasLegacySharePath = currentPath.includes('dataUrl=fitlinksShareKey');
    const lastShareHandledAt = getLastShareHandledAtMs();
    const ageMs = Date.now() - lastShareHandledAt;
    const within2sOfShare = ageMs >= 0 && ageMs < 2000;

    if (within2sOfShare || hasLegacySharePath) {
      console.log('[FL_NAV_DIAG] +not-found redirect suppressed', {
        file: 'app/+not-found.tsx',
        reason: within2sOfShare ? 'recent_share_handled' : 'legacy_share_path',
        pathname: currentPath,
        within2sOfShare,
        hasLegacySharePath,
        ageMsSinceShareHandled: ageMs,
        ts: Date.now(),
      });
      setIgnoreDueToShare(true);
      return;
    }

    hasRedirectedRef.current = true;
    console.log('[FL_NAV_DIAG] redirect->library (+not-found fallback)', {
      file: 'app/+not-found.tsx',
      reason: 'not_share_related',
      pathname: currentPath,
      within2sOfShare,
      hasLegacySharePath,
      ageMsSinceShareHandled: ageMs,
      ts: Date.now(),
    });
    router.replace('/(tabs)');
  }, [pathname]);

  if (ignoreDueToShare) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
