import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useEntitlements } from '../../src/hooks/useEntitlements';
import { Colors, Spacing, FontSize, BorderRadius } from '../../src/constants/theme';
import { PLAN_LIMITS } from '../../src/constants/limits';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { tier, isPro, limits } = useEntitlements(profile);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={Colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tier.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plan Details</Text>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Max Workouts</Text>
          <Text style={styles.planValue}>
            {isPro ? 'Unlimited' : limits.maxWorkouts}
          </Text>
        </View>
        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Max Collections</Text>
          <Text style={styles.planValue}>
            {isPro ? 'Unlimited' : limits.maxCollections}
          </Text>
        </View>
      </View>

      {!isPro && (
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/upgrade')}>
          <Ionicons name="rocket-outline" size={20} color={Colors.text} />
          <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={Colors.accent} />
        <Text style={styles.signOutBtnText}>Sign Out</Text>
      </TouchableOpacity>
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
    backgroundColor: Colors.surfaceLight,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  badgeText: {
    color: Colors.text,
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
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  upgradeBtnText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
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
  },
  signOutBtnText: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
