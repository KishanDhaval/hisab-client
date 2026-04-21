import { useState, useEffect, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { itemsAPI, uploadAPI } from '../../../../services/api';
import { toPaise, toRupees } from '../../../../utils/currency';
import { Colors, Fonts, Spacing, Radius, Shadows } from '../../../../constants/theme';

const UNITS = ['kg', 'g', 'litre', 'ml', 'pcs', 'dozen', 'packet', 'box', 'metre', 'other'];

export default function EditItemScreen() {
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [image, setImage] = useState(null);
  const [isNewImage, setIsNewImage] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setIsNewImage(true);
    }
  };

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data } = await itemsAPI.get(id);
        const item = data.item;
        setName(item.name);
        setUnit(item.unit);
        setPriceDisplay(toRupees(item.defaultPrice).toString());
        setImage(item.image);
      } catch (error) {
        Alert.alert('Error', 'Failed to load item details.');
        router.back();
      } finally {
        setInitialLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleUpdate = async () => {
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
      let imageUrl = image;
      
      // If a new image was picked, upload it first
      if (image && isNewImage) {
        const uploadRes = await uploadAPI.image(image);
        imageUrl = uploadRes.data.url;
      }

      await itemsAPI.update(id, {
        name: name.trim(),
        unit,
        defaultPrice: toPaise(priceNum),
        image: imageUrl,
      });
      Alert.alert('Success', 'Item updated successfully.');
      router.back();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? It will be removed from future transactions but kept in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await itemsAPI.delete(id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
          <Text style={styles.title}>Edit Item</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={24} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {/* Photo Picker */}
          <View style={styles.photoContainer}>
            {image ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removePhoto} 
                  onPress={() => {
                    setImage(null);
                    setIsNewImage(false);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
                <Ionicons name="camera-outline" size={32} color={Colors.primary} />
                <Text style={styles.photoPickerText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

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
            onPress={handleUpdate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Update Item</Text>
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
  deleteBtn: { padding: Spacing.xs },
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
  
  // Photo Picker Styles
  photoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  photoPicker: {
    width: 120,
    height: 120,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoPickerText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.card,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
});
