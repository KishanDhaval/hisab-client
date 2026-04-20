import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { transactionsAPI } from '../../../services/api';
import { formatCurrency } from '../../../utils/currency';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../constants/theme';

const PERIODS = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTxn, setExpandedTxn] = useState(null);

  const fetchTransactions = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const params = { page: pageNum, limit: 20 };
        if (period !== 'all') params.period = period;

        setError(null);
        const { data } = await transactionsAPI.list(params);

        if (append) {
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          setTransactions(data.transactions);
        }
        setHasMore(pageNum < data.pagination.pages);
      } catch (err) {
        console.error('Fetch transactions error:', err);
        setError('Failed to load history. Tap to retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period]
  );

  // Re-fetch on screen focus and period change
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      fetchTransactions(1);
    }, [fetchTransactions])
  );

  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, true);
  };

  const toggleExpand = (id) => {
    setExpandedTxn((prev) => (prev === id ? null : id));
  };

  const renderTransaction = ({ item }) => {
    const isExpanded = expandedTxn === item._id;

    return (
      <TouchableOpacity
        style={[styles.txnCard, isExpanded && styles.txnCardExpanded]}
        onPress={() => toggleExpand(item._id)}
        activeOpacity={0.8}
      >
        <View style={styles.txnCardMain}>
          <View
            style={[
              styles.txnBadge,
              { backgroundColor: item.type === 'CREDIT' ? Colors.creditBg : Colors.debitBg },
            ]}
          >
            <Ionicons
              name={item.type === 'CREDIT' ? 'arrow-up' : 'arrow-down'}
              size={18}
              color={item.type === 'CREDIT' ? Colors.credit : Colors.debit}
            />
          </View>
          <View style={styles.txnInfo}>
            <Text style={styles.txnCustomer}>{item.customer?.name || 'Unknown'}</Text>
            <Text style={styles.txnType}>
              {item.type === 'CREDIT'
                ? `${item.items?.length || 0} items`
                : 'Payment received'}
            </Text>
            <Text style={styles.txnDate}>
              {new Date(item.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <Text
            style={[
              styles.txnAmount,
              { color: item.type === 'CREDIT' ? Colors.credit : Colors.debit },
            ]}
          >
            {item.type === 'CREDIT' ? '+' : '-'}
            {formatCurrency(item.totalAmount)}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.txnDetails}>
            {item.items && item.items.length > 0 && (
              <View style={styles.liList}>
                {item.items.map((li, idx) => (
                  <View key={idx} style={styles.liRow}>
                    <Text style={styles.liName}>
                      {li.name} ({li.quantity} {li.unit})
                    </Text>
                    <Text style={styles.liSubtotal}>{formatCurrency(li.subtotal)}</Text>
                  </View>
                ))}
              </View>
            )}
            {item.note ? (
              <Text style={styles.txnNoteText}>
                <Text style={{ fontWeight: '600' }}>Note:</Text> {item.note}
              </Text>
            ) : null}
            {(!item.items || item.items.length === 0) && !item.note && (
              <Text style={styles.txnNoteText}>No additional details.</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {/* Period Filter */}
      <View style={styles.filterRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.filterChip, period === p.key && styles.filterChipActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.filterText, period === p.key && styles.filterTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading && page === 1 ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : error && page === 1 ? (
        <TouchableOpacity style={styles.errorContainer} onPress={() => { setPage(1); fetchTransactions(1); }}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setPage(1);
                fetchTransactions(1);
              }}
              tintColor={Colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasMore && !loading ? (
              <ActivityIndicator color={Colors.primary} style={styles.listFooter} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 16,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  loader: { marginTop: Spacing.xxxl },
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
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  txnCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  txnCardExpanded: {
    backgroundColor: Colors.surfaceLight, // slight highlight when open
  },
  txnCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txnBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnInfo: { flex: 1, marginLeft: Spacing.md },
  txnCustomer: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.text },
  txnType: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 1 },
  txnDate: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  txnAmount: { fontSize: Fonts.sizes.base, fontWeight: '800' },
  txnDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  liList: { marginBottom: Spacing.sm },
  liRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  liName: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  liSubtotal: { fontSize: Fonts.sizes.sm, color: Colors.text, fontWeight: '600' },
  txnNoteText: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, fontStyle: 'italic' },
  listFooter: { paddingVertical: Spacing.lg },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl * 2 },
  emptyText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
