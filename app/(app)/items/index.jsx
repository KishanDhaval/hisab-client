import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { itemsAPI } from '../../../services/api';
import { formatCurrency } from '../../../utils/currency';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../constants/theme';

export default function ItemsListScreen() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { active: 'true' };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const { data } = await itemsAPI.list(params);
      setItems(data.items);
    } catch (err) {
      console.error('Fetch items error:', err);
      setError('Failed to load items. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch]);

  // Re-fetch every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => router.push(`/items/edit/${item._id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.itemIcon}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemThumbnail} />
        ) : (
          <Ionicons name="cube" size={22} color={Colors.primary} />
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemUnit}>{item.unit}</Text>
      </View>
      <Text style={styles.itemPrice}>{formatCurrency(item.defaultPrice)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Items</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(app)/items/add')}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
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

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : error ? (
        <TouchableOpacity style={styles.errorContainer} onPress={() => { setLoading(true); fetchItems(); }}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No items yet</Text>
              <Text style={styles.emptySubText}>Tap + to add items to your inventory</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 16,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: Fonts.sizes.xxl, fontWeight: '800', color: Colors.text },
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: { flex: 1, marginLeft: Spacing.md },
  itemName: { fontSize: Fonts.sizes.base, fontWeight: '600', color: Colors.text },
  itemUnit: { fontSize: Fonts.sizes.sm, color: Colors.textMuted, marginTop: 2 },
  itemThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.md,
  },
  itemPrice: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.primary },
  empty: { alignItems: 'center', marginTop: Spacing.xxxl * 2 },
  emptyText: { fontSize: Fonts.sizes.lg, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md },
  emptySubText: { fontSize: Fonts.sizes.md, color: Colors.textMuted, marginTop: Spacing.xs },
});
