import * as React from 'react'
import { ScrollView, View, StyleSheet, FlatList } from 'react-native'
import { Text, Button as PaperButton, Divider, Chip } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'

export default function Sales() {
  const [range, setRange] = React.useState<'Today' | 'This Week'>('Today')
  type Order = { id: string; orderNo: string; customer: string; items: number; total: string; status: 'Paid' | 'Pending' }
  const orders: Order[] = [
    { id: 'o1', orderNo: 'INV-1001', customer: 'Rahul Verma', items: 3, total: '₹ 4,999', status: 'Paid' },
    { id: 'o2', orderNo: 'INV-1002', customer: 'Priya Singh', items: 1, total: '₹ 1,499', status: 'Pending' },
    { id: 'o3', orderNo: 'INV-1003', customer: 'Amit Patel', items: 2, total: '₹ 3,299', status: 'Paid' },
    { id: 'o4', orderNo: 'INV-1004', customer: 'Neha Sharma', items: 4, total: '₹ 6,750', status: 'Paid' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Sales" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Filters + Primary CTA */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['Today','This Week'] as const).map(l => (
                <Chip key={l} selected={range===l} onPress={() => setRange(l)}>{l}</Chip>
              ))}
            </View>
            <PaperButton mode="contained">New Invoice</PaperButton>
          </View>
        </Card>

        {/* KPI row */}
        <View style={styles.grid}> 
          <Card>
            <Text variant="titleMedium">Today Sales</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>₹ 45,230</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Orders</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>128</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Avg Order Value</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>₹ 1,220</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Returns</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>4</Text>
          </Card>
        </View>

        {/* Shortcuts */}
        <Card>
          <Text variant="titleMedium">Shortcuts</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <PaperButton mode="outlined">Refund</PaperButton>
            <PaperButton mode="outlined">Hold Bill</PaperButton>
            <PaperButton mode="outlined">Daily Report</PaperButton>
          </View>
        </Card>

        {/* Recent Orders */}
        <Card>
          <Text variant="titleMedium">Recent Orders</Text>
          <Divider style={{ marginVertical: 8 }} />
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.row}> 
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.orderNo} • {item.customer}</Text>
                  <Text style={styles.rowSub}>{item.items} items • {item.status}</Text>
                </View>
                <Text style={styles.rowAmount}>{item.total}</Text>
              </View>
            )}
          />
        </Card>
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
  rowAmount: { fontWeight: '700' },
})
