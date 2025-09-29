import * as React from 'react'
import { Appbar } from 'react-native-paper'

export default function Header({ title }: { title: string }) {
  return (
    <Appbar.Header mode="small" elevated>
      <Appbar.Content title={title} />
    </Appbar.Header>
  )
}
