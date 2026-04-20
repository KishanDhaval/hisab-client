import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [sections, setSections] = useState([]);
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showPicker, setShowPicker] = useState(null); // 'start' or 'end'

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTxn, setExpandedTxn] = useState(null);

  const groupTransactionsByDate = (txns) => {
    const groups = txns.reduce((acc, txn) => {
      const date = new Date(txn.date);
      const title = date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      if (!acc[title]) acc[title] = [];
      acc[title].push(txn);
      return acc;
    }, {});

    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a)) // Ensure chronological order
      .map(date => ({
        title: date,
        data: groups[date]
      }));
  };

  const fetchTransactions = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const params = { page: pageNum, limit: 20 };
        
        if (startDate && endDate) {
          params.startDate = startDate.toISOString();
          params.endDate = endDate.toISOString();
        } else if (period !== 'all') {
          params.period = period;
        }

        setError(null);
        const { data } = await transactionsAPI.list(params);

        const newTxns = append 
          ? [...sections.flatMap(s => s.data), ...data.transactions]
          : data.transactions;
        
        setSections(groupTransactionsByDate(newTxns));
        setHasMore(pageNum < data.pagination.pages);
      } catch (err) {
        console.error('Fetch transactions error:', err);
        setError('Failed to load history. Tap to retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, startDate, endDate, sections]
  );

  // Re-fetch on filters change
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchTransactions(1);
  }, [period, startDate, endDate]);

  const onDateChange = (event, selectedDate) => {
    setShowPicker(null);
    if (!selectedDate) return;

    if (showPicker === 'start') {
      setStartDate(selectedDate);
      if (endDate && selectedDate > endDate) setEndDate(selectedDate);
    } else {
      setEndDate(selectedDate);
      if (startDate && selectedDate < startDate) setStartDate(selectedDate);
    }
  };

  const resetDates = () => {
    setStartDate(null);
    setEndDate(null);
    setPeriod('all');
  };

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
    const itemSummary = item.items?.length > 0 
      ? item.items.slice(0, 2).map(i => i.name).join(', ') + (item.items.length > 2 ? ` +${item.items.length - 2} more` : '')
      : 'Payment Received';

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
            <TouchableOpacity onPress={() => router.push(`/(app)/customers/${item.customer?._id}`)}>
              <Text style={styles.txnCustomer}>{item.customer?.name || 'Unknown'}</Text>
            </TouchableOpacity>
            <Text style={styles.txnItemsLine} numberOfLines={1}>
              {itemSummary}
            </Text>
            <Text style={styles.txnTime}>
              {new Date(item.date).toLocaleTimeString('en-IN', {
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
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const isToday = title === today;

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{isToday ? 'Today' : title}</Text>
      </View>
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
            style={[styles.filterChip, period === p.key && !startDate && styles.filterChipActive]}
            onPress={() => { setPeriod(p.key); setStartDate(null); setEndDate(null); }}
          >
            <Text style={[styles.filterText, period === p.key && !startDate && styles.filterTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Date Range */}
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity 
          style={[styles.datePickerBtn, startDate && styles.datePickerBtnActive]} 
          onPress={() => setShowPicker('start')}
        >
          <Ionicons name="calendar-outline" size={16} color={startDate ? Colors.white : Colors.textSecondary} />
          <Text style={[styles.datePickerText, startDate && styles.datePickerTextActive]}>
            {startDate ? startDate.toLocaleDateString('en-IN') : 'Start Date'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.dateRangeSeparator}>→</Text>

        <TouchableOpacity 
          style={[styles.datePickerBtn, endDate && styles.datePickerBtnActive]} 
          onPress={() => setShowPicker('end')}
        >
          <Ionicons name="calendar-outline" size={16} color={endDate ? Colors.white : Colors.textSecondary} />
          <Text style={[styles.datePickerText, endDate && styles.datePickerTextActive]}>
            {endDate ? endDate.toLocaleDateString('en-IN') : 'End Date'}
          </Text>
        </TouchableOpacity>

        {(startDate || endDate) && (
          <TouchableOpacity style={styles.clearDateBtn} onPress={resetDates}>
            <Ionicons name="close-circle" size={20} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          value={showPicker === 'start' ? (startDate || new Date()) : (endDate || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* List */}
      {loading && page === 1 ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : error && page === 1 ? (
        <TouchableOpacity style={styles.errorContainer} onPress={() => { setPage(1); fetchTransactions(1); }}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderTransaction}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={true}
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
  
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  datePickerBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  datePickerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  datePickerTextActive: {
    color: Colors.white,
  },
  dateRangeSeparator: {
    color: Colors.textMuted,
    fontWeight: '700',
  },
  clearDateBtn: {
    padding: 4,
  },

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
  txnItemsLine: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 1, marginBottom: 2 },
  txnTime: { fontSize: Fonts.sizes.xs, color: Colors.textMuted },
  txnAmount: { fontSize: Fonts.sizes.base, fontWeight: '800' },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.md,
  },
  sectionHeaderText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
