import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { reservationService } from '../../services/reservationService';
import { inventoryService } from '../../services/inventoryService';
import { entityService } from '../../services/entityService';
import { InventoryItem, BorrowerEntity } from '../../types';

export default function CreateReservationScreen({
  navigation,
}: any): React.JSX.Element {
  const [entities, setEntities] = useState<BorrowerEntity[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    { inventory_id: number; quantity: number }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entityData, invData] = await Promise.all([
        entityService.findAll({ limit: 100 }),
        inventoryService.findAll({ limit: 100 }),
      ]);
      setEntities(entityData.data);
      setInventory(invData.data);
    } catch {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (inventoryId: number) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.inventory_id === inventoryId);
      if (exists) {
        return prev.filter((i) => i.inventory_id !== inventoryId);
      }
      return [...prev, { inventory_id: inventoryId, quantity: 1 }];
    });
  };

  const updateQuantity = (inventoryId: number, quantity: number) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.inventory_id === inventoryId ? { ...i, quantity: Math.max(1, quantity) } : i
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedEntityId) {
      Alert.alert('Validation', 'Please select a borrower entity');
      return;
    }
    if (!startDate || !endDate || !pickupTime || !returnTime) {
      Alert.alert('Validation', 'Please fill all date/time fields');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Validation', 'Please select at least one item');
      return;
    }

    setSubmitting(true);
    try {
      await reservationService.create({
        borrower_entity_id: selectedEntityId,
        pickup_time: pickupTime,
        return_time: returnTime,
        start_date: startDate,
        end_date: endDate,
        notes,
        items: selectedItems,
        packages: [],
      });
      Alert.alert('Success', 'Reservation created successfully');
      navigation.goBack();
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to create reservation';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#1a237e" style={styles.loader} />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Borrower Entity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {entities.map((entity) => (
            <TouchableOpacity
              key={entity.id}
              style={[
                styles.chip,
                selectedEntityId === entity.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedEntityId(entity.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedEntityId === entity.id && styles.chipTextSelected,
                ]}
              >
                {entity.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <TextInput
          style={styles.input}
          placeholder="Start Date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
        />
        <TextInput
          style={styles.input}
          placeholder="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Pickup Time (HH:MM)"
          value={pickupTime}
          onChangeText={setPickupTime}
        />
        <TextInput
          style={styles.input}
          placeholder="Return Time (HH:MM)"
          value={returnTime}
          onChangeText={setReturnTime}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Items</Text>
        {inventory.map((item) => {
          const selected = selectedItems.find(
            (i) => i.inventory_id === item.id
          );
          return (
            <View key={item.id} style={styles.itemRow}>
              <TouchableOpacity
                style={styles.itemCheckbox}
                onPress={() => toggleItem(item.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    selected && styles.checkboxSelected,
                  ]}
                >
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemAvailable}>
                    Available: {item.available_quantity}
                  </Text>
                </View>
              </TouchableOpacity>
              {selected && (
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    onPress={() =>
                      updateQuantity(item.id, selected.quantity - 1)
                    }
                  >
                    <Text style={styles.qtyButton}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{selected.quantity}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      updateQuantity(item.id, selected.quantity + 1)
                    }
                  >
                    <Text style={styles.qtyButton}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Optional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Create Reservation</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#1a237e',
  },
  chipText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  itemAvailable: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    fontSize: 20,
    color: '#1a237e',
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 24,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#1a237e',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
