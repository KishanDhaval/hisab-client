import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { offlineStore } from '../../stores/offlineStore';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../constants/theme';
import { useState, useEffect } from 'react';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    offlineStore.getPendingCount().then(setPendingCount);
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Profile',
      sublabel: user?.email,
      onPress: () => Alert.alert('Profile', 'Profile editing coming soon!'),
    },
    {
      icon: 'cloud-offline-outline',
      label: 'Offline Queue',
      sublabel: `${pendingCount} pending`,
      onPress: () => Alert.alert('Offline Queue', `You have ${pendingCount} requests pending sync.`),
    },
    {
      icon: 'information-circle-outline',
      label: 'About',
      sublabel: 'v1.0.0',
      onPress: () => Alert.alert('Hisab', 'Digital Ledger v1.0.0\nBuilt for smart shopkeepers.'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userShop}>{user?.shopName || 'My Shop'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Menu */}
      {menuItems.map((item, idx) => (
        <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
          <View style={styles.menuIcon}>
            <Ionicons name={item.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuSublabel}>{item.sublabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.xl, paddingTop: Spacing.xxxl + 16 },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.primary },
  userInfo: { flex: 1, marginLeft: Spacing.md },
  userName: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.text },
  userShop: { fontSize: Fonts.sizes.sm, color: Colors.primary, marginTop: 1 },
  userEmail: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuInfo: { flex: 1, marginLeft: Spacing.md },
  menuLabel: { fontSize: Fonts.sizes.base, fontWeight: '600', color: Colors.text },
  menuSublabel: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    marginTop: Spacing.xxl,
  },
  logoutText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.danger },
});
