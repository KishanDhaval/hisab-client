import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { transactionsAPI } from '../../services/api';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currency';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../constants/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [dashRes, txnRes] = await Promise.all([
        transactionsAPI.dashboard(),
        transactionsAPI.list({ limit: 5 })
      ]);
      setData(dashRes.data);
      setRecentTransactions(txnRes.data.transactions);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Failed to load dashboard data. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-fetch every time user navigates to dashboard tab
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const cards = [
    {
      title: 'Outstanding Balance',
      value: formatCurrencyCompact(data?.totalOutstanding || 0),
      icon: 'wallet-outline',
      color: Colors.accent,
      bg: Colors.creditBg,
    },
    {
      title: 'Collected Today',
      value: formatCurrencyCompact(data?.collectedToday || 0),
      icon: 'trending-up-outline',
      color: Colors.success,
      bg: Colors.successBg || Colors.debitBg,
    },
    {
      title: 'Total Credit Given',
      value: formatCurrencyCompact(data?.totalCredit || 0),
      icon: 'arrow-up-circle-outline',
      color: Colors.credit,
      bg: Colors.creditBg,
    },
    {
      title: 'Total Payments',
      value: formatCurrencyCompact(data?.totalDebit || 0),
      icon: 'arrow-down-circle-outline',
      color: Colors.debit,
      bg: Colors.debitBg,
    },
  ];

  const renderRecentTxn = (txn) => {
    const itemSummary = txn.items?.length > 0 
      ? txn.items.slice(0, 2).map(i => i.name).join(', ') + (txn.items.length > 2 ? ` +${txn.items.length - 2}` : '')
      : 'Payment Received';

    return (
      <TouchableOpacity 
        key={txn._id} 
        style={styles.recentTxn}
        onPress={() => router.push(`/(app)/customers/${txn.customer?._id}`)}
      >
        <View style={[styles.txnIcon, { backgroundColor: txn.type === 'CREDIT' ? Colors.creditBg : Colors.debitBg }]}>
          <Ionicons 
            name={txn.type === 'CREDIT' ? 'arrow-up' : 'arrow-down'} 
            size={16} 
            color={txn.type === 'CREDIT' ? Colors.credit : Colors.debit} 
          />
        </View>
        <View style={styles.txnInfo}>
          <Text style={styles.txnCustomer}>{txn.customer?.name}</Text>
          <Text style={styles.txnItems} numberOfLines={1}>{itemSummary}</Text>
        </View>
        <View style={styles.txnEnd}>
          <Text style={[styles.txnAmount, { color: txn.type === 'CREDIT' ? Colors.credit : Colors.debit }]}>
            {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.totalAmount)}
          </Text>
          <Text style={styles.txnTime}>{new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : error ? (
          <TouchableOpacity style={styles.errorContainer} onPress={() => { setLoading(true); fetchDashboard(); }}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Greeting */}
            <View style={styles.greeting}>
              <View>
                <Text style={styles.greetingSmall}>Welcome back,</Text>
                <Text style={styles.greetingName}>{user?.name || 'Shopkeeper'}</Text>
                {user?.shopName ? <Text style={styles.shopName}>{user.shopName}</Text> : null}
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.cardsGrid}>
              {cards.map((card, idx) => (
                <View key={idx} style={[styles.card, { borderLeftColor: card.color }]}>
                  <View style={[styles.iconBadge, { backgroundColor: card.bg }]}>
                    <Ionicons name={card.icon} size={22} color={card.color} />
                  </View>
                  <Text style={styles.cardValue}>{card.value}</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(app)/transactions/add')}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.primaryGhost }]}>
                  <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
                </View>
                <Text style={styles.actionLabel}>New Entry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(app)/customers')}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.debitBg }]}>
                  <Ionicons name="person-add-outline" size={28} color={Colors.debit} />
                </View>
                <Text style={styles.actionLabel}>Customers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(app)/transactions/history')}
              >
                <View style={[styles.actionIcon, { backgroundColor: Colors.warningLight }]}>
                  <Ionicons name="time-outline" size={28} color={Colors.warning} />
                </View>
                <Text style={styles.actionLabel}>History</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Activity */}
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/transactions/history')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentActivity}>
              {recentTransactions.length > 0 ? (
                recentTransactions.map(renderRecentTxn)
              ) : (
                <Text style={styles.emptyText}>No recent activity</Text>
              )}
            </View>
            <View style={{ height: Spacing.xl }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    marginTop: Spacing.xxxl,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxxl,
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl + 16,
  },
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greetingSmall: {
    fontSize: Fonts.sizes.md,
    color: Colors.textSecondary,
  },
  greetingName: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  shopName: {
    fontSize: Fonts.sizes.sm,
    color: Colors.primary,
    marginTop: 2,
  },
  notifBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    padding: Spacing.md,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    width: '47%',
    borderLeftWidth: 3,
    ...Shadows.card,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardValue: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  cardTitle: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
  },
  recentActivity: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    ...Shadows.card,
  },
  recentTxn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  txnIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  txnInfo: {
    flex: 1,
  },
  txnCustomer: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: Fonts.sizes.md,
  },
  txnItems: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.xs,
    marginTop: 2,
  },
  txnEnd: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontWeight: '800',
    fontSize: Fonts.sizes.sm,
  },
  txnTime: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    paddingVertical: Spacing.lg,
  },
});
