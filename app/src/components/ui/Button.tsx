import * as React from 'react'
import { ActivityIndicator } from 'react-native'
import { Button as PaperButton } from 'react-native-paper'

type Props = React.ComponentProps<typeof PaperButton> & {
  loading?: boolean
}

export default function Button({ loading, children, mode = 'contained', ...rest }: Props) {
  return (
    <PaperButton
      mode={mode}
      contentStyle={{ paddingVertical: 8 }}
      style={{ borderRadius: 12, elevation: mode === 'contained' ? 1 : 0 }}
      {...rest}
    >
      {loading ? <ActivityIndicator color="#fff" /> : children}
    </PaperButton>
  )
}
