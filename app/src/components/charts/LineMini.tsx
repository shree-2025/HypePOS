import * as React from 'react'
import Svg, { Path } from 'react-native-svg'
import { View } from 'react-native'

export default function LineMini() {
  // Simple placeholder sparkline path
  return (
    <View style={{ height: 80 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 40">
        <Path d="M0 30 L15 20 L30 25 L45 12 L60 18 L75 10 L90 15" stroke="#6366f1" strokeWidth="2" fill="none" />
      </Svg>
    </View>
  )
}
