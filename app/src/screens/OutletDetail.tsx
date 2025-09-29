import * as React from 'react'
import { ScrollView, View, StyleSheet, FlatList } from 'react-native'
import { Text, Divider } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'

export default function OutletDetail() {
  type P = { id: string; sku: string; name: string; stock: number; sold: number; price: string }
  const products: P[] = [
    { id: 'p1', sku: 'SKU-001', name: 'Running Shoes', stock: 12, sold: 5, price: '₹ 1,499' },
    { id: 'p2', sku: 'SKU-007', name: 'Casual Sneakers', stock: 6, sold: 8, price: '₹ 1,299' },
    { id: 'p3', sku: 'SKU-012', name: 'Leather Boots', stock: 2, sold: 3, price: '₹ 3,499' },
  ]
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Outlet Detail" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* KPI strip */}
        <View style={styles.grid}>
          <Card>
            <Text variant="titleMedium">SKUs</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>42</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Total Stock</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>386</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Sold</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>124</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Remaining</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>262</Text>
          </Card>
        </View>

        {/* Product list */}
        <Card>
          <Text variant="titleMedium">Products</Text>
          <Divider style={{ marginVertical: 8 }} />
          <FlatList
            data={products}
            keyExtractor={(i) => i.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.sku} • {item.name}</Text>
                  <Text style={styles.rowSub}>Stock: {item.stock} • Sold: {item.sold}</Text>
                </View>
                <Text style={styles.rowAmount}>{item.price}</Text>
              </View>
            )}
          />
        </Card>

        {/* Notes */}
        <Card>
          <Text variant="titleMedium">Notes</Text>
          <Text style={{ color: '#64748B', marginTop: 8 }}>Delivery every Tue & Fri. Promo: BUY2GET1</Text>
        </Card>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  grid: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 4, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  rowTitle: { fontWeight: '600' },
  rowSub: { color: '#64748B', marginTop: 2 },
  rowAmount: { fontWeight: '700' },
})
