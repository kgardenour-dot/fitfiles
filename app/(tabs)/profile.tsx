import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useEntitlements } from '../../src/hooks/useEntitlements';
import { usePurchases } from '../../src/contexts/PurchasesContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { ConfettiDots } from '../../src/components/ConfettiDots';
import { openManageSubscriptions } from '../../src/utils/subscriptions';
import { hasProEntitlement } from '../../src/config/revenuecat';

const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { tier, isPro, limits } = useEntitlements(profile);
  const { hasApiKey, restorePurchases } = usePurchases();
  const [restoring, setRestoring] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info && hasProEntitlement(info)) {
        Alert.alert('Restored', 'Your purchases were restored.');
      } else {
        Alert.alert('No purchases found', 'There is nothing to restore for this account.');
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ConfettiDots />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* User card */}
      <View style={styles.section}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={Colors.aquaMint} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            <View style={[styles.badge, isPro && styles.badgePro]}>
              <Text style={styles.badgeText}>{tier.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Plan details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plan Details</Text>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Max Workouts</Text>
          <Text style={styles.planValue}>
            {limits.maxWorkouts === Infinity ? 'Unlimited' : limits.maxWorkouts}
          </Text>
        </View>
        <View style={[styles.planRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.planLabel}>Max Collections</Text>
          <Text style={styles.planValue}>
            {limits.maxCollections === Infinity ? 'Unlimited' : limits.maxCollections}
          </Text>
        </View>
      </View>

      {/* Upgrade button */}
      {!isPro && (
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/upgrade')} activeOpacity={0.8}>
          <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
          <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
        </TouchableOpacity>
      )}

      {isPro && hasApiKey && isNativeMobile ? (
        <TouchableOpacity style={styles.secondaryBtn} onPress={openManageSubscriptions} activeOpacity={0.8}>
          <Ionicons name="open-outline" size={20} color={Colors.aquaMint} />
          <Text style={styles.secondaryBtnText}>Manage subscription</Text>
        </TouchableOpacity>
      ) : null}

      {hasApiKey && isNativeMobile ? (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.8}
        >
          {restoring ? (
            <ActivityIndicator color={Colors.aquaMint} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color={Colors.aquaMint} />
              <Text style={styles.secondaryBtnText}>Restore purchases</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.coralPulse} />
        <Text style={styles.signOutBtnText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Logo at bottom */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/fitlinks_logo.png')}
          style={styles.bottomLogo}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.aquaMint + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  email: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.iceBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  badgePro: {
    backgroundColor: Colors.sunriseYellow,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  planLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  planValue: {
    color: Colors.aquaMint,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.coralPulse,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    shadowColor: Colors.coralPulse,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    color: Colors.aquaMint,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.coralPulse + '40',
  },
  signOutBtnText: {
    color: Colors.coralPulse,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  bottomLogo: {
    width: 180,
    height: 48,
    opacity: 0.4,
  },
});
