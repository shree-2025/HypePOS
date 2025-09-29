import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'auth_token'

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY)
}
