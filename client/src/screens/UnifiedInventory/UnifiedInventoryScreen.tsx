import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { inventoryService } from '../../services/inventoryService';
import { packageService } from '../../services/packageService';
import { InventoryItem, Package } from '../../types';

type UnifiedItem =
  | { type: 'item'; data: InventoryItem }
  | { type: 'package'; data: Package };

export default function UnifiedInventoryScreen({
  navigation,
}: any): React.JSX.Element {
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        const [inventoryResult, packagesResult] = await Promise.all([
          inventoryService.findAll({ page: pageNum, limit: 20, search }),
          packageService.findAll({ page: pageNum, limit: 20, search }),
        ]);

        const unified: UnifiedItem[] = [
          ...inventoryResult.data.map((d) => ({ type: 'item' as const, data: d })),
          ...packagesResult.data.map((d) => ({
            type: 'package' as const,
            data: d,
          })),
        ];

        unified.sort((a, b) => a.data.name.localeCompare(b.data.name));

        if (append) {
          setItems((prev) => [...prev, ...unified]);
        } else {
          setItems(unified);
        }

        setHasMore(
          inventoryResult.data.length === 20 || packagesResult.data.length === 20
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    loadData(1);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadData(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadData(nextPage, true);
  };

  const renderItem = ({ item }: { item: UnifiedItem }) => (
    <TouchableOpacity
      style={[
        styles.itemCard,
        item.type === 'package' && styles.packageCard,
      ]}
      onPress={() => {
        if (item.type === 'item') {
          navigation.navigate('InventoryDetail', { id: item.data.id });
        } else {
          navigation.navigate('PackageDetail', { id: item.data.id });
        }
      }}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemType}>
          {item.type === 'package' ? '📦 Package' : '📄 Item'}
        </Text>
        {item.type === 'item' && (
          <Text
            style={[
              styles.quantityBadge,
              (item.data as InventoryItem).available_quantity <= 0 &&
                styles.quantityBadgeLow,
            ]}
          >
            {(item.data as InventoryItem).available_quantity} available
          </Text>
        )}
      </View>
      <Text style={styles.itemName}>{item.data.name}</Text>
      {item.data.description && (
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.data.description}
        </Text>
      )}
      {item.type === 'package' && (
        <Text style={styles.itemMeta}>
          {(item.data as Package).items?.length || 0} items in package
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search items and packages..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {loading && page === 1 ? (
        <ActivityIndicator size="large" color="#1a237e" style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items or packages found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  loader: {
    marginTop: 40,
  },
  itemCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  packageCard: {
    borderLeftColor: '#9c27b0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemType: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  quantityBadge: {
    fontSize: 11,
    color: '#4caf50',
    fontWeight: '600',
  },
  quantityBadgeLow: {
    color: '#f44336',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#9c27b0',
    marginTop: 6,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 15,
  },
});
