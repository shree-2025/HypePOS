import * as React from 'react'
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import { useNavigation } from '@react-navigation/native'

export default function Outlets() {
  const nav = useNavigation<any>()
  const outlets = [
    { id: 'S01', name: 'Outlet 01', subtitle: 'S01 — Main Street' },
    { id: 'S02', name: 'Outlet 02', subtitle: 'S02 — Central Plaza' },
  ]
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Outlets" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          {outlets.map(o => (
            <TouchableOpacity key={o.id} activeOpacity={0.8} onPress={() => nav.navigate('OutletDetail', { id: o.id, name: o.name })}>
              <Card>
                <Text variant="titleMedium">{o.name}</Text>
                <Text style={{ color: '#64748B' }}>{o.subtitle}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  grid: { gap: 12 },
})
