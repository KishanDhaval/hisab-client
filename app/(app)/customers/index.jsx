import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { customersAPI } from '../../../services/api';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../constants/theme';

export default function CustomersListScreen() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Add Customer modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // Validate on input change
  useEffect(() => {
    const newErrors = {};
    if (newName && newName.trim().length < 2) {
      newErrors.name = 'Name is too short';
    }
    if (newPhone && !/^\d{10,15}$/.test(newPhone)) {
      newErrors.phone = 'Enter a valid phone number (10-15 digits)';
    }
    setErrors(newErrors);
  }, [newName, newPhone]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const { data } = await customersAPI.list(params);
      setCustomers(data.customers);
    } catch (err) {
      console.error('Fetch customers error:', err);
      setError('Failed to load customers. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch]);

  // Re-fetch on screen focus (e.g. after navigating back)
  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [fetchCustomers])
  );

  const handleCreateCustomer = async () => {
    // Final check
    if (!newName.trim()) {
      setErrors(prev => ({ ...prev, name: 'Name is required' }));
      return;
    }
    if (!newPhone.trim()) {
      setErrors(prev => ({ ...prev, phone: 'Phone is required' }));
      return;
    }
    if (Object.keys(errors).length > 0) return;

    setCreating(true);
    try {
      await customersAPI.create({ name: newName.trim(), phone: newPhone.trim() });
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setErrors({});
      fetchCustomers();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create customer.');
    } finally {
      setCreating(false);
    }
  };

  const isFormValid = newName.trim().length >= 2 && /^\d{10,15}$/.test(newPhone);

  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => router.push(`/(app)/customers/${item._id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerPhone}>{item.phone}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : error ? (
        <TouchableOpacity style={styles.errorContainer} onPress={() => { setLoading(true); fetchCustomers(); }}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomer}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCustomers(); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No customers yet</Text>
              <Text style={styles.emptySubText}>Tap + to add your first customer</Text>
            </View>
          }
        />
      )}

      {/* ─── Add Customer Modal ─────────────────────────────── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Customer</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Name *</Text>
              <TextInput
                style={[styles.modalInput, errors.name && styles.inputError]}
                placeholder="Customer name"
                placeholderTextColor={Colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              {errors.name && <Text style={styles.errorTextSmall}>{errors.name}</Text>}
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Phone *</Text>
              <TextInput
                style={[styles.modalInput, errors.phone && styles.inputError]}
                placeholder="10-digit phone number"
                placeholderTextColor={Colors.textMuted}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
              {errors.phone && <Text style={styles.errorTextSmall}>{errors.phone}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, (creating || !isFormValid) && styles.modalBtnDisabled]}
              onPress={handleCreateCustomer}
              disabled={creating || !isFormValid}
            >
              {creating ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.modalBtnText}>Create Customer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 16,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.button,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    color: Colors.text,
    fontSize: Fonts.sizes.base,
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
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  customerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  customerName: {
    fontSize: Fonts.sizes.base,
    fontWeight: '600',
    color: Colors.text,
  },
  customerPhone: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    marginTop: Spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: Fonts.sizes.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubText: {
    fontSize: Fonts.sizes.md,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  modalField: {
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Fonts.sizes.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.button,
  },
  modalBtnDisabled: { opacity: 0.6 },
  modalBtnText: {
    color: Colors.white,
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerBg || '#FFF5F5',
  },
  errorTextSmall: {
    color: Colors.danger,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
