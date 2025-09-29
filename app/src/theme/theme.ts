import { MD3LightTheme as DefaultTheme } from 'react-native-paper'

export const colors = {
  primary: '#6366f1',
  surface: '#F8FAFC',
  text: '#111827',
}

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.surface,
    surface: '#FFFFFF',
    onSurface: colors.text,
  },
  roundness: 12,
}
