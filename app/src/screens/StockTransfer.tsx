import * as React from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import LineMini from '@/components/charts/LineMini'

export default function StockTransfer() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Stock Transfer" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          <Card>
            <Text variant="titleMedium">Total Transfers</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4 }}>18</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Transfers by Day</Text>
            <LineMini />
          </Card>
          <Card>
            <Text variant="titleMedium">Recent Activity</Text>
            <Text style={{ color: '#64748B', marginTop: 8 }}>HQ → S01 (20 units), S01 → S02 (10 units)</Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  grid: { gap: 12 },
})
