import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { customersAPI, itemsAPI, transactionsAPI } from '../../../services/api';
import { toPaise, toRupees, safeMultiply, formatCurrency } from '../../../utils/currency';
import { syncService } from '../../../services/sync';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../constants/theme';

export default function AddTransactionScreen() {
  const params = useLocalSearchParams();
  const [step, setStep] = useState(1); // 1: Select Customer/Type, 2: Details, 3: Success/History

  // Data
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // Selections
  const [type, setType] = useState(params.type || 'CREDIT');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Step 2 Fields
  const [lineItems, setLineItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [custRes, itemRes] = await Promise.all([
          customersAPI.list({ limit: 1000 }), // Fetch plenty for search
          itemsAPI.list({ active: 'true' }),
        ]);
        setCustomers(custRes.data.customers);
        setItems(itemRes.data.items);

        // Pre-select customer if ID provided in params
        if (params.customerId) {
          const found = custRes.data.customers.find(c => c._id === params.customerId);
          if (found) {
            setSelectedCustomer(found);
            // If we have customer, we can potentially skip to step 2 if type is also known
            // But let's stay on step 1 to confirm selection
          }
        }
      } catch (error) {
        console.error('Load data error:', error);
      }
    };
    loadData();
  }, [params.customerId]);

  const transitionTo = (nextStep) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(nextStep);
  };

  const fetchCustomerHistory = async (id) => {
    setFetchingHistory(true);
    try {
      const { data } = await transactionsAPI.list({ customerId: id, limit: 10 });
      setHistory(data.transactions);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleNext = () => {
    if (!selectedCustomer) {
      Alert.alert('Selection Required', 'Please select a customer first.');
      return;
    }
    transitionTo(2);
  };

  const addLineItem = async (item) => {
    if (lineItems.find(li => li.itemId === item._id)) {
      Alert.alert('Already Added', 'This item is already in the list.');
      return;
    }

    try {
      const { data: priceData } = await transactionsAPI.smartPrice(selectedCustomer._id, item._id);
      setLineItems(prev => [
        ...prev,
        {
          itemId: item._id,
          name: item.name,
          unit: item.unit,
          quantity: 1,
          pricePaise: priceData.price,
          priceDisplay: toRupees(priceData.price).toString(),
          priceSource: priceData.priceSource,
          subtotal: priceData.price,
        }
      ]);
    } catch (e) {
      setLineItems(prev => [
        ...prev,
        {
          itemId: item._id,
          name: item.name,
          unit: item.unit,
          quantity: 1,
          pricePaise: item.defaultPrice,
          priceDisplay: toRupees(item.defaultPrice).toString(),
          priceSource: 'DEFAULT',
          subtotal: item.defaultPrice,
        }
      ]);
    }
    setShowItemPicker(false);
    setItemSearch('');
  };

  const updateQty = (index, delta) => {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const newQty = Math.max(0, (parseFloat(item.quantity) || 0) + delta);
      item.quantity = newQty.toString();
      item.subtotal = safeMultiply(newQty, item.pricePaise);
      updated[index] = item;
      return updated;
    });
  };

  const updatePrice = (index, val) => {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.priceDisplay = val;
      const price = toPaise(parseFloat(val) || 0);
      item.pricePaise = price;
      item.priceSource = 'MANUAL';
      item.subtotal = safeMultiply(parseFloat(item.quantity) || 0, price);
      updated[index] = item;
      return updated;
    });
  };

  const totalAmount = type === 'CREDIT' 
    ? lineItems.reduce((s, i) => s + i.subtotal, 0)
    : toPaise(parseFloat(paymentAmount) || 0);

  const handleSubmit = async () => {
    if (type === 'CREDIT' && lineItems.length === 0) {
      Alert.alert('Error', 'Add at least one item');
      return;
    }
    if (type === 'DEBIT' && totalAmount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        customerId: selectedCustomer._id,
        totalAmount,
        note: note.trim(),
        date: date.toISOString(),
      };

      if (type === 'CREDIT') {
        payload.items = lineItems.map(li => ({
          itemId: li.itemId,
          quantity: parseFloat(li.quantity),
          priceAtSale: li.pricePaise,
        }));
      }

      await syncService.executeWithOfflineFallback({
        method: 'post',
        url: '/transactions',
        data: payload,
      });

      // Fetch updated history for step 3
      await fetchCustomerHistory(selectedCustomer._id);
      transitionTo(3);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForMore = () => {
    setLineItems([]);
    setPaymentAmount('');
    setNote('');
    transitionTo(2);
  };

  // ─── Sub-Components ──────────────────────────────────────────────────

  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map(s => (
        <View key={s} style={styles.stepContainer}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{s}</Text>
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  // ─── Render Steps ────────────────────────────────────────────────────

  const renderStep1 = () => {
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.phone.includes(customerSearch)
    );

    return (
      <View style={styles.stepContent}>
        <Text style={styles.sectionTitle}>Select Customer</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.textMuted}
          value={customerSearch}
          onChangeText={setCustomerSearch}
        />
        
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          style={styles.customerList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.customerCard, selectedCustomer?._id === item._id && styles.customerCardActive]}
              onPress={() => setSelectedCustomer(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerPhone}>{item.phone}</Text>
              </View>
              {selectedCustomer?._id === item._id && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No customers found</Text>
          }
        />

        <Text style={styles.sectionTitle}>Transaction Type</Text>
        <View style={styles.typeToggle}>
          <TouchableOpacity 
            style={[styles.typeBtn, type === 'CREDIT' && styles.typeBtnActiveCredit]}
            onPress={() => setType('CREDIT')}
          >
            <Ionicons name="arrow-up-circle" size={20} color={type === 'CREDIT' ? Colors.white : Colors.credit} />
            <Text style={[styles.typeText, type === 'CREDIT' && styles.typeTextActive]}>Credit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, type === 'DEBIT' && styles.typeBtnActiveDebit]}
            onPress={() => setType('DEBIT')}
          >
            <Ionicons name="cash" size={20} color={type === 'DEBIT' ? Colors.white : Colors.debit} />
            <Text style={[styles.typeText, type === 'DEBIT' && styles.typeTextActive]}>Payment</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.mainBtn} onPress={handleNext}>
          <Text style={styles.mainBtnText}>Next Step</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} keyboardShouldPersistTaps="handled">
      <View style={styles.selectedHeader}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarTextSmall}>{selectedCustomer?.name[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.headerName}>{selectedCustomer?.name}</Text>
        <TouchableOpacity style={styles.changeBtn} onPress={() => transitionTo(1)}>
          <Text style={styles.changeBtnText}>Change</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Date</Text>
      <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
        <Text style={styles.dateText}>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          onChange={(e, d) => { setShowDatePicker(false); if(d) setDate(d); }}
        />
      )}

      {type === 'CREDIT' ? (
        <View style={styles.itemsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Items</Text>
            <TouchableOpacity style={styles.addMoreBtn} onPress={() => setShowItemPicker(true)}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addMoreText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {showItemPicker && (
            <View style={styles.pickerPopup}>
              <TextInput
                style={styles.pickerSearch}
                placeholder="Search item..."
                value={itemSearch}
                onChangeText={setItemSearch}
                autoFocus
              />
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).map(item => (
                  <TouchableOpacity key={item._id} style={styles.pickerOption} onPress={() => addLineItem(item)}>
                    <Text style={styles.optionName}>{item.name}</Text>
                    <Text style={styles.optionPrice}>{formatCurrency(item.defaultPrice)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerClose} onPress={() => setShowItemPicker(false)}>
                <Text style={styles.pickerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {lineItems.map((li, idx) => (
            <View key={li.itemId} style={styles.lineItem}>
              <View style={styles.lineTop}>
                <Text style={styles.lineName}>{li.name}</Text>
                <TouchableOpacity onPress={() => setLineItems(l => l.filter((_, i) => i !== idx))}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.lineBottom}>
                <View style={styles.stepper}>
                  <TouchableOpacity onPress={() => updateQty(idx, -1)} style={styles.stepBtn}>
                    <Ionicons name="remove" size={18} color={Colors.text} />
                  </TouchableOpacity>
                  <TextInput 
                    style={styles.qtyInput} 
                    keyboardType="decimal-pad" 
                    value={li.quantity.toString()} 
                    onChangeText={(v) => {
                      const updated = [...lineItems];
                      updated[idx].quantity = v;
                      updated[idx].subtotal = safeMultiply(parseFloat(v) || 0, updated[idx].pricePaise);
                      setLineItems(updated);
                    }}
                  />
                  <TouchableOpacity onPress={() => updateQty(idx, 1)} style={styles.stepBtn}>
                    <Ionicons name="add" size={18} color={Colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.lineUnit}>×</Text>
                <TextInput
                  style={styles.priceInput}
                  keyboardType="decimal-pad"
                  value={li.priceDisplay}
                  onChangeText={(v) => updatePrice(idx, v)}
                />
                <Text style={styles.lineTotal}>{formatCurrency(li.subtotal)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>Amount Paid (₹)</Text>
          <View style={styles.paymentInputRow}>
            <Text style={styles.rupeeLarge}>₹</Text>
            <TextInput
              style={styles.paymentInput}
              placeholder="0"
              keyboardType="decimal-pad"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              autoFocus
            />
          </View>
        </View>
      )}

      <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Note (Optional)</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="Add details..."
        multiline
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.footerSpacer} />
    </ScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.successHeader}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
        </View>
        <Text style={styles.successTitle}>Transaction Recorded!</Text>
        <Text style={styles.successAmount}>{formatCurrency(totalAmount)}</Text>
        <Text style={styles.successSub}>{selectedCustomer?.name}</Text>
      </View>

      <Text style={styles.historyLabel}>Recent for this client</Text>
      {fetchingHistory ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item._id}
          style={{ maxHeight: 300 }}
          renderItem={({ item }) => (
            <View style={styles.historyRow}>
              <View style={[styles.historyBadge, { backgroundColor: item.type === 'CREDIT' ? Colors.creditBg : Colors.debitBg }]}>
                <Ionicons name={item.type === 'CREDIT' ? 'arrow-up' : 'arrow-down'} size={14} color={item.type === 'CREDIT' ? Colors.credit : Colors.debit} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyText}>{item.type === 'CREDIT' ? 'Udhaar' : 'Jama'}</Text>
                <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString('en-IN')}</Text>
              </View>
              <Text style={[styles.historyAmt, { color: item.type === 'CREDIT' ? Colors.credit : Colors.debit }]}>
                {item.type === 'CREDIT' ? '+' : '-'}{formatCurrency(item.totalAmount)}
              </Text>
            </View>
          )}
        />
      )}

      <View style={styles.step3Actions}>
        <TouchableOpacity style={styles.addMoreFinal} onPress={resetForMore}>
          <Ionicons name="add" size={24} color={Colors.primary} />
          <Text style={styles.addMoreFinalText}>Add Another</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.mainHeader}>
        <TouchableOpacity onPress={() => step > 1 ? transitionTo(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.mainTitle}>{step === 1 ? 'New Entry' : step === 2 ? 'Details' : 'Success'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <StepIndicator />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {step === 2 && (
        <View style={styles.totalBar}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Submit</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xl + 20,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  mainTitle: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.text },
  
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepContainer: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGhost },
  stepDotText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  stepDotTextActive: { color: Colors.primary },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.primary },

  stepContent: { flex: 1, paddingHorizontal: Spacing.xl },
  sectionTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.text, marginVertical: Spacing.sm },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },

  // Step 1
  searchInput: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  customerList: { flex: 1, marginBottom: Spacing.lg },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customerCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryGhost },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.white, fontWeight: '700' },
  customerName: { color: Colors.text, fontWeight: '600', fontSize: 15 },
  customerPhone: { color: Colors.textMuted, fontSize: 12 },
  
  typeToggle: { flexDirection: 'row', gap: Spacing.md, marginVertical: Spacing.md },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  typeBtnActiveCredit: { backgroundColor: Colors.credit, borderColor: Colors.credit },
  typeBtnActiveDebit: { backgroundColor: Colors.debit, borderColor: Colors.debit },
  typeText: { fontWeight: '700', color: Colors.textSecondary },
  typeTextActive: { color: Colors.white },
  
  mainBtn: { backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: Radius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginVertical: Spacing.xl },
  mainBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },

  // Step 2
  selectedHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.md },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarTextSmall: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  headerName: { flex: 1, color: Colors.text, fontWeight: '700' },
  changeBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  dateField: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 12, borderRadius: 10, marginVertical: 8, gap: 10, borderWidth: 1, borderColor: Colors.border },
  dateText: { color: Colors.text, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addMoreText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },

  pickerPopup: { backgroundColor: Colors.surface, borderRadius: 15, padding: 15, marginTop: 10, ...Shadows.card, borderWidth: 1, borderColor: Colors.primary },
  pickerSearch: { backgroundColor: Colors.surfaceLight, padding: 10, borderRadius: 10, color: Colors.text, marginBottom: 10 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionName: { color: Colors.text, fontWeight: '600' },
  optionPrice: { color: Colors.primary, fontWeight: '700' },
  pickerClose: { alignItems: 'center', marginTop: 10 },
  pickerCloseText: { color: Colors.danger, fontWeight: '600' },

  lineItem: { backgroundColor: Colors.surface, borderRadius: 15, padding: 12, marginTop: 10, borderWidth: 1, borderColor: Colors.border },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  lineName: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  lineBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: 8, overflow: 'hidden' },
  stepBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { width: 40, textAlign: 'center', color: Colors.text, fontWeight: '700', fontSize: 14 },
  lineUnit: { color: Colors.textMuted },
  priceInput: { flex: 1, backgroundColor: Colors.surfaceLight, padding: 4, borderRadius: 5, textAlign: 'center', color: Colors.text, fontWeight: '600' },
  lineTotal: { width: 80, textAlign: 'right', color: Colors.primary, fontWeight: '800' },

  paymentInputRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.xl, justifyContent: 'center' },
  rupeeLarge: { fontSize: 40, fontWeight: '800', color: Colors.debit, marginRight: 10 },
  paymentInput: { fontSize: 50, fontWeight: '800', color: Colors.text, minWidth: 100 },
  noteInput: { backgroundColor: Colors.surface, padding: 12, borderRadius: 10, color: Colors.text, height: 80, textAlignVertical: 'top', marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  footerSpacer: { height: 120 },

  totalBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, padding: Spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, ...Shadows.card },
  totalLabel: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase' },
  totalValue: { fontSize: 24, fontWeight: '800', color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, ...Shadows.button },
  submitBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },

  // Step 3
  successHeader: { alignItems: 'center', marginVertical: 40 },
  successIcon: { marginBottom: 15 },
  successTitle: { fontSize: 24, fontWeight: '800', color: Colors.success, marginBottom: 5 },
  successAmount: { fontSize: 40, fontWeight: '900', color: Colors.text },
  successSub: { fontSize: 16, color: Colors.textSecondary },
  historyLabel: { fontSize: 14, fontWeight: '700', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase' },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyBadge: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  historyText: { color: Colors.text, fontWeight: '600' },
  historyDate: { color: Colors.textMuted, fontSize: 12 },
  historyAmt: { fontWeight: '800', fontSize: 15 },
  step3Actions: { flexDirection: 'row', gap: 15, marginVertical: Spacing.xl },
  addMoreFinal: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, borderWidth: 2, borderColor: Colors.primary, gap: 8 },
  addMoreFinalText: { color: Colors.primary, fontWeight: '800', fontSize: 16 },
  doneBtn: { flex: 1, backgroundColor: Colors.primary, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginVertical: 20 },
});
