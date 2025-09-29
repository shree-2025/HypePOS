import * as React from 'react'
import { ScrollView, View, StyleSheet, FlatList } from 'react-native'
import { Text, Divider } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import LineMini from '@/components/charts/LineMini'

export default function Inventory() {
  type Item = { id: string; sku: string; name: string; stock: number }
  const lowStock: Item[] = [
    { id: 'p1', sku: 'SKU-001', name: 'Running Shoes', stock: 5 },
    { id: 'p2', sku: 'SKU-007', name: 'Casual Sneakers', stock: 3 },
    { id: 'p3', sku: 'SKU-012', name: 'Leather Boots', stock: 2 },
  ]
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Inventory" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* KPI row */}
        <View style={styles.grid}>
          <Card>
            <Text variant="titleMedium">Total SKUs</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>240</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Total Stock</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>12,430</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Low Stock</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>12</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Out of Stock</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>3</Text>
            <LineMini />
          </Card>
        </View>

        {/* Low Stock list */}
        <Card>
          <Text variant="titleMedium">Low Stock</Text>
          <Divider style={{ marginVertical: 8 }} />
          <FlatList
            data={lowStock}
            keyExtractor={(i) => i.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.row}> 
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.sku} • {item.name}</Text>
                  <Text style={styles.rowSub}>Stock: {item.stock}</Text>
                </View>
              </View>
            )}
          />
        </Card>

        {/* Category placeholder */}
        <View style={styles.grid}>
          <Card>
            <Text variant="titleMedium">Stock by Category</Text>
            <Text style={{ color: '#64748B', marginTop: 8 }}>Chart coming soon…</Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  grid: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  rowTitle: { fontWeight: '600' },
  rowSub: { color: '#64748B', marginTop: 2 },
})
