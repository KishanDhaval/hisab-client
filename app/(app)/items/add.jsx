import { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { itemsAPI } from '../../../services/api';
import { toPaise, toRupees } from '../../../utils/currency';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../constants/theme';

const UNITS = ['kg', 'g', 'litre', 'ml', 'pcs', 'dozen', 'packet', 'box', 'metre', 'other'];

export default function AddItemScreen() {
  const [success, setSuccess] = useState(false);
  const [lastItem, setLastItem] = useState(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Item name is required.');
      return;
    }
    const priceNum = parseFloat(priceDisplay);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Error', 'Please enter a valid price.');
      return;
    }

    setLoading(true);
    try {
      const newItem = {
        name: name.trim(),
        unit,
        defaultPrice: toPaise(priceNum),
      };
      await itemsAPI.create(newItem);
      setLastItem(newItem);
      setSuccess(true);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create item.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setUnit('pcs');
    setPriceDisplay('');
    setSuccess(false);
  };

  if (success) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
        </View>
        <Text style={styles.successTitle}>Item Created!</Text>
        <View style={styles.itemSummary}>
          <Text style={styles.summaryName}>{lastItem?.name}</Text>
          <Text style={styles.summaryPrice}>{formatCurrency(lastItem?.defaultPrice)} / {lastItem?.unit}</Text>
        </View>

        <View style={styles.successActions}>
          <TouchableOpacity style={styles.addMoreBtn} onPress={resetForm}>
            <Ionicons name="add" size={24} color={Colors.primary} />
            <Text style={styles.addMoreText}>Add Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to List</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Item</Text>
        </View>

        <View style={styles.form}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rice, Soap, etc."
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Unit */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Price (₹) *</Text>
            <View style={styles.priceInput}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                value={priceDisplay}
                onChangeText={setPriceDisplay}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Create Item</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Spacing.xl, paddingTop: Spacing.xxxl + 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  backBtn: { marginRight: Spacing.md, padding: Spacing.xs },
  title: { fontSize: Fonts.sizes.xl, fontWeight: '800', color: Colors.text },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  inputGroup: { marginBottom: Spacing.base },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Fonts.sizes.base,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitScroll: { marginTop: Spacing.xs },
  unitChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  unitChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitChipText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  unitChipTextActive: {
    color: Colors.white,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeeSign: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadows.button,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: Fonts.sizes.lg, fontWeight: '700' },
  
  // Success Screen
  successContainer: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  successIcon: { marginBottom: Spacing.md },
  successTitle: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.success, marginBottom: Spacing.lg },
  itemSummary: { backgroundColor: Colors.surface, padding: Spacing.xl, borderRadius: Radius.lg, width: '100%', alignItems: 'center', marginBottom: Spacing.xxxl, ...Shadows.card },
  summaryName: { fontSize: Fonts.sizes.xl, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  summaryPrice: { fontSize: Fonts.sizes.base, color: Colors.primary, fontWeight: '600' },
  successActions: { width: '100%', gap: Spacing.md },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.primary, gap: Spacing.sm },
  addMoreText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.primary },
  doneBtn: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', ...Shadows.button },
  doneBtnText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.white },
});
