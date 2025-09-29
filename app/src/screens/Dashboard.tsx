import * as React from 'react'
import { ScrollView, View, StyleSheet, FlatList } from 'react-native'
import { Text, Button as PaperButton, Divider } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'

export default function Dashboard() {
  type Activity = { id: string; text: string; time: string }
  const activity: Activity[] = [
    { id: 'a1', text: 'Order INV-1204 created (₹1,299)', time: '2m ago' },
    { id: 'a2', text: 'Transfer HQ → S01 completed (20 units)', time: '15m ago' },
    { id: 'a3', text: 'Stock adjusted for SKU-007 (+5)', time: '1h ago' },
  ]
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Dashboard" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Quick actions */}
        <Card>
          <Text variant="titleMedium">Quick Actions</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <PaperButton mode="contained" onPress={() => {}}>New Sale</PaperButton>
            <PaperButton mode="outlined" onPress={() => {}}>Transfer Stock</PaperButton>
            <PaperButton mode="outlined" onPress={() => {}}>Add Product</PaperButton>
          </View>
        </Card>

        {/* KPI strip */}
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
            <Text variant="titleMedium">Low Stock</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>12</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Open Transfers</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>3</Text>
          </Card>
        </View>

        {/* Recent activity */}
        <Card>
          <Text variant="titleMedium">Recent Activity</Text>
          <Divider style={{ marginVertical: 8 }} />
          <FlatList
            data={activity}
            keyExtractor={(i) => i.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{item.text}</Text>
                <Text style={styles.rowSub}>{item.time}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 4, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  rowTitle: { fontWeight: '600' },
  rowSub: { color: '#64748B' },
})
