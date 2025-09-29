import * as React from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'

export default function Support() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Support" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          <Card>
            <Text variant="titleMedium">FAQ</Text>
            <Text style={{ color: '#64748B', marginTop: 8 }}>How to add products? Process a sale? Transfer stock?</Text>
          </Card>
          <Card>
            <Text variant="titleMedium">Contact Us</Text>
            <Text style={{ color: '#64748B', marginTop: 8 }}>support@example.com | +91-00000-00000</Text>
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
