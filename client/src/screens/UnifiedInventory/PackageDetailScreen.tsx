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
import { packageService } from '../../services/packageService';
import { Package } from '../../types';

export default function PackageDetailScreen({
  route,
  navigation,
}: any): React.JSX.Element {
  const { id } = route.params;
  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackage();
  }, [id]);

  const loadPackage = async () => {
    try {
      const data = await packageService.findById(id);
      setPkg(data);
    } catch {
      Alert.alert('Error', 'Failed to load package details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Package',
      'Are you sure? This will cancel dependent reservations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await packageService.delete(id);
              Alert.alert('Success', 'Package deleted');
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete package');
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

  if (!pkg) {
    return (
      <View style={styles.container}>
        <Text>Package not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.packageIcon}>📦</Text>
        <Text style={styles.name}>{pkg.name}</Text>
        {pkg.description && (
          <Text style={styles.description}>{pkg.description}</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Items in Package</Text>
      {pkg.items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete Package</Text>
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
    alignItems: 'center',
  },
  packageIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  itemRow: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
