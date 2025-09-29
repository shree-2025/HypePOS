import * as React from 'react'
import { View, ViewProps } from 'react-native'

export default function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}
