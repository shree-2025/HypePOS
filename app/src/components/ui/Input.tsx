import * as React from 'react'
import { TextInput } from 'react-native-paper'

type Props = React.ComponentProps<typeof TextInput> & {
  errorText?: string
}

export default function Input({ errorText, mode = 'outlined', style, ...rest }: Props) {
  return (
    <TextInput
      mode={mode}
      style={[{ backgroundColor: '#fff', borderRadius: 12 }, style]}
      error={!!errorText}
      {...rest}
    />
  )
}
