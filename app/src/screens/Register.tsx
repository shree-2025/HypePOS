import * as React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useNavigation } from '@react-navigation/native'

export default function Register() {
  const nav = useNavigation<any>()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const onSubmit = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    nav.goBack()
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text variant="titleLarge" style={styles.title}>Create account</Text>
        <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <Input label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry style={styles.input} />
        <Button onPress={onSubmit} loading={loading}>
          Register
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: '#F8FAFC' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 14, elevation: 2 },
  title: { marginBottom: 12 },
  input: { marginBottom: 12 },
})
