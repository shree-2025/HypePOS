import * as React from 'react'
import { ScrollView, View, StyleSheet, FlatList } from 'react-native'
import { Text, Button as PaperButton, Chip, Divider } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import LineMini from '@/components/charts/LineMini'

export default function Reports() {
  const [range, setRange] = React.useState<'This Month' | 'Quarter' | 'Year'>('This Month')
  type R = { id: string; name: string; period: string; outlet: string; created: string }
  const recent: R[] = [
    { id: 'r1', name: 'Monthly Sales', period: 'Aug 2025', outlet: 'HQ', created: 'Sep 01' },
    { id: 'r2', name: 'Inventory Snapshot', period: 'Aug 2025', outlet: 'All', created: 'Aug 31' },
    { id: 'r3', name: 'Category Performance', period: 'Q2 2025', outlet: 'All', created: 'Jul 01' },
  ]
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Reports" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Stat cards */}
        <View style={styles.grid}>
          <Card>
            <Text variant="titleMedium">Available Reports</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>6</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Last 30 days</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>24 exports</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Scheduled</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>3</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Downloads</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>158</Text>
            <LineMini />
          </Card>
        </View>

        {/* Filters + Chart */}
        <Card>
          <Text variant="titleMedium">Sales by Month</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(['This Month','Quarter','Year'] as const).map((label) => (
              <Chip key={label} selected={range===label} onPress={() => setRange(label)}>{label}</Chip>
            ))}
          </View>
          <View style={{ marginTop: 8 }}>
            <LineMini />
          </View>
        </Card>

        {/* Recent reports list */}
        <Card>
          <Text variant="titleMedium">Recent Reports</Text>
          <Divider style={{ marginVertical: 8 }} />
          <FlatList
            data={recent}
            keyExtractor={(i)=>i.id}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.name} • {item.period}</Text>
                  <Text style={styles.rowSub}>Outlet: {item.outlet} • Created: {item.created}</Text>
                </View>
                <PaperButton mode="outlined">Open</PaperButton>
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
  rowSub: { color: '#64748B', marginTop: 2 },
})
