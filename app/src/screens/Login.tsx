import * as React from 'react'
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useNavigation } from '@react-navigation/native'

export default function Login() {
  const nav = useNavigation<any>()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [role, setRole] = React.useState<'master' | 'admin'>('master')
  const [outlet, setOutlet] = React.useState<'HQ' | 'S01' | 'S02'>('HQ')

  const onSubmit = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    // Optionally pass role/outlet to Main
    nav.reset({ index: 0, routes: [{ name: 'Main', params: { role, outlet } }] })
  }

  const quickMaster = () => {
    setRole('master')
    setEmail('master@demo.com')
    setPassword('password')
  }

  const quickAdmin = () => {
    setRole('admin')
    setOutlet('S01')
    setEmail('admin@demo.com')
    setPassword('password')
  }

  return (
    <View style={styles.container}>
      {/* Brand header image */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600&auto=format&fit=crop' }}
        style={styles.headerImage}
        resizeMode="cover"
      />

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🛍️</Text>
          </View>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=400&auto=format&fit=crop' }}
            style={styles.cardThumb}
          />
        </View>

        <Text variant="titleLarge" style={styles.title}>Sign in to continue</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          <TouchableOpacity onPress={() => setRole('master')} style={[styles.roleBtn, role==='master' && styles.roleBtnActive]}>
            <Text style={[styles.roleText, role==='master' && styles.roleTextActive]}>Master</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRole('admin')} style={[styles.roleBtn, role==='admin' && styles.roleBtnActive]}>
            <Text style={[styles.roleText, role==='admin' && styles.roleTextActive]}>Outlet Admin</Text>
          </TouchableOpacity>
        </View>

        {role === 'admin' && (
          <View style={styles.outletRow}>
            {(['HQ','S01','S02'] as const).map((o) => (
              <TouchableOpacity key={o} onPress={() => setOutlet(o)} style={[styles.chip, outlet===o && styles.chipActive]}>
                <Text style={[styles.chipText, outlet===o && styles.chipTextActive]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Button onPress={onSubmit} loading={loading}>
          Sign In
        </Button>

        {/* Demo logins */}
        <View style={styles.demoRow}>
          <Button mode="outlined" onPress={quickMaster}>Demo Master</Button>
          <Button mode="outlined" onPress={quickAdmin}>Demo Admin</Button>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerImage: { width: '100%', height: 160 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 14, elevation: 2, margin: 16, marginTop: -32 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(14,98,200,0.08)', alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 20 },
  cardThumb: { width: 80, height: 40, borderRadius: 8, backgroundColor: '#EEF2F7' },
  title: { marginTop: 12, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  roleBtnActive: { borderColor: '#14B8A6', backgroundColor: 'rgba(20,184,166,0.1)' },
  roleText: { color: '#374151' },
  roleTextActive: { color: '#14B8A6', fontWeight: '600' },
  outletRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: '#14B8A6', backgroundColor: 'rgba(20,184,166,0.1)' },
  chipText: { color: '#374151' },
  chipTextActive: { color: '#14B8A6', fontWeight: '600' },
  input: { marginBottom: 12 },
  demoRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
})
