import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { customersAPI, transactionsAPI } from '../../../services/api';
import { formatCurrency, toPaise } from '../../../utils/currency';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../constants/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

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
      .sort((a, b) => new Date(b) - new Date(a))
      .map(date => ({
        title: date,
        data: groups[date]
      }));
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [custRes, txnRes, balRes] = await Promise.all([
        customersAPI.get(id),
        transactionsAPI.list({ customerId: id, limit: 100 }),
        customersAPI.balance(id),
      ]);
      setCustomer(custRes.data.customer);
      setEditForm({ name: custRes.data.customer.name, phone: custRes.data.customer.phone });
      setTransactions(groupTransactionsByDate(txnRes.data.transactions));
      setBalance(balRes.data.outstanding);
    } catch (err) {
      console.error('Customer detail error:', err);
      setError('Failed to load customer details. Tap to retry.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Re-fetch when screen gains focus (e.g. after adding a transaction)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loader}>
        <TouchableOpacity style={styles.errorContainer} onPress={fetchData}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer? This will also delete ALL their transactions from your ledger. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await customersAPI.delete(id);
              router.back();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete customer.');
            }
          }
        }
      ]
    );
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      Alert.alert('Error', 'Name and phone are required.');
      return;
    }
    try {
      await customersAPI.update(id, editForm);
      setIsEditing(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update customer.');
    }
  };

  const handleSettle = () => {
    Alert.alert(
      'Settle Balance',
      `Record a payment of ${formatCurrency(balance)} to clear this account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await transactionsAPI.create({
                type: 'DEBIT',
                customerId: id,
                totalAmount: toPaise(balance),
                note: 'Settled full balance',
                date: new Date().toISOString(),
              });
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Failed to record settlement.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderTransaction = ({ item }) => {
    const itemSummary = item.items?.length > 0 
      ? item.items.slice(0, 2).map(i => i.name).join(', ') + (item.items.length > 2 ? ` +${item.items.length - 2} more` : '')
      : 'Payment Received';

    return (
      <View style={styles.txnCard}>
        <View style={[styles.txnBadge, { backgroundColor: item.type === 'CREDIT' ? Colors.creditBg : Colors.debitBg }]}>
          <Ionicons
            name={item.type === 'CREDIT' ? 'arrow-up' : 'arrow-down'}
            size={18}
            color={item.type === 'CREDIT' ? Colors.credit : Colors.debit}
          />
        </View>
        <View style={styles.txnInfo}>
          <Text style={styles.txnType}>{itemSummary}</Text>
          <Text style={styles.txnTime}>
            {new Date(item.date).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {item.note ? <Text style={styles.txnNote}>{item.note}</Text> : null}
        </View>
        <Text style={[styles.txnAmount, { color: item.type === 'CREDIT' ? Colors.credit : Colors.debit }]}>
          {item.type === 'CREDIT' ? '+' : '-'}{formatCurrency(item.totalAmount)}
        </Text>
      </View>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        {isEditing ? (
          <View style={styles.headerInfo}>
            <TextInput
              style={styles.editInputName}
              value={editForm.name}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
              placeholder="Name"
              autoFocus
            />
            <TextInput
              style={styles.editInputPhone}
              value={editForm.phone}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
          </View>
        ) : (
          <View style={styles.headerInfo}>
            <Text style={styles.customerName}>{customer?.name}</Text>
            <Text style={styles.customerPhone}>{customer?.phone}</Text>
          </View>
        )}
        
        {isEditing ? (
          <>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.iconBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleUpdate} style={styles.iconBtn}>
              <Ionicons name="checkmark" size={24} color={Colors.success} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconBtn}>
              <Ionicons name="pencil" size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={22} color={Colors.danger} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <SectionList
        sections={transactions}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.txnList}
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Outstanding Balance</Text>
                {balance > 0 && (
                  <TouchableOpacity style={styles.settleBadge} onPress={handleSettle}>
                    <Ionicons name="checkmark-done" size={16} color={Colors.white} />
                    <Text style={styles.settleText}>Settle</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.balanceValue, { color: balance > 0 ? Colors.credit : Colors.debit }]}>
                {formatCurrency(Math.abs(balance))}
              </Text>
              <Text style={styles.balanceSub}>
                {balance > 0 ? 'Customer owes you' : balance < 0 ? 'You owe customer' : 'All settled'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.creditBg }]}
                onPress={() => router.push({ pathname: '/(app)/transactions/add', params: { customerId: id, type: 'CREDIT' } })}
              >
                <Ionicons name="add-circle" size={20} color={Colors.credit} />
                <Text style={[styles.actionText, { color: Colors.credit }]}>Add Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.debitBg }]}
                onPress={() => router.push({ pathname: '/(app)/transactions/add', params: { customerId: id, type: 'DEBIT' } })}
              >
                <Ionicons name="cash" size={20} color={Colors.debit} />
                <Text style={[styles.actionText, { color: Colors.debit }]}>Record Payment</Text>
              </TouchableOpacity>
            </View>

            {/* Transaction History Title */}
            <Text style={styles.sectionTitle}>Full History</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 16,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  headerInfo: { flex: 1, marginRight: Spacing.sm },
  iconBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  customerName: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.text },
  customerPhone: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  editInputName: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '800',
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 2,
    padding: 0,
  },
  editInputPhone: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 0,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  settleText: {
    color: Colors.white,
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
  },
  balanceLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  balanceValue: { fontSize: Fonts.sizes.hero, fontWeight: '800', marginVertical: Spacing.xs },
  balanceSub: { fontSize: Fonts.sizes.sm, color: Colors.textMuted },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  actionText: { fontSize: Fonts.sizes.md, fontWeight: '700' },
  sectionTitle: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  txnList: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  txnBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnInfo: { flex: 1, marginLeft: Spacing.md },
  txnType: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.text },
  txnTime: { fontSize: Spacing.md, color: Colors.textMuted, marginTop: 2 },
  txnNote: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  txnAmount: { fontSize: Fonts.sizes.base, fontWeight: '800' },
  sectionHeader: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionHeaderText: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl },
  emptyText: { fontSize: Fonts.sizes.md, color: Colors.textMuted },
});
