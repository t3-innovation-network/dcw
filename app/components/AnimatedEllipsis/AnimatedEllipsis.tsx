import React, { useEffect, useRef } from 'react'
import { Animated, StyleProp, Text, TextStyle } from 'react-native'

type AnimatedEllipsisProps = {
  style?: StyleProp<TextStyle>
  numberOfDots?: number
  minOpacity?: number
  animationDelay?: number
}

/**
 * Animated loading ellipsis ("...") whose dots fade in and out in a staggered
 * wave. Drop-in replacement for the unmaintained `rn-animated-ellipsis`
 * package, implemented with React Native's `Animated` API (native driver).
 */
export default function AnimatedEllipsis({
  style,
  numberOfDots = 3,
  minOpacity = 0.4,
  animationDelay = 300
}: AnimatedEllipsisProps): React.ReactElement {
  const opacities = useRef(
    Array.from({ length: numberOfDots }, () => new Animated.Value(minOpacity))
  ).current

  useEffect(() => {
    const pulse = opacities.map((opacity) =>
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: animationDelay,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: minOpacity,
          duration: animationDelay,
          useNativeDriver: true
        })
      ])
    )
    const loop = Animated.loop(Animated.stagger(animationDelay, pulse))
    loop.start()
    return () => loop.stop()
  }, [opacities, animationDelay, minOpacity])

  return (
    <Text style={style}>
      {opacities.map((opacity, index) => (
        <Animated.Text key={index} style={{ opacity }}>
          .
        </Animated.Text>
      ))}
    </Text>
  )
}
