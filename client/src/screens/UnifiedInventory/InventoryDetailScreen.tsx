import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { inventoryService } from '../../services/inventoryService';
import { InventoryItem } from '../../types';

export default function InventoryDetailScreen({
  route,
  navigation,
}: any): React.JSX.Element {
  const { id } = route.params;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      const data = await inventoryService.findById(id);
      setItem(data);
    } catch {
      Alert.alert('Error', 'Failed to load item details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure? This will cancel dependent reservations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventoryService.delete(id);
              Alert.alert('Success', 'Item deleted');
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#1a237e" style={styles.loader} />
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Item not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Quantity</Text>
          <Text style={styles.statValue}>{item.total_quantity}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Available</Text>
          <Text style={[styles.statValue, styles.available]}>
            {item.available_quantity}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Reserved</Text>
          <Text style={[styles.statValue, styles.reserved]}>
            {item.total_quantity - item.available_quantity}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete Item</Text>
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
  card: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    padding: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    margin: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  available: {
    color: '#4caf50',
  },
  reserved: {
    color: '#ff9800',
  },
  deleteButton: {
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  deleteText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: '600',
  },
});
