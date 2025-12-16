import React from 'react'
import { Image, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { SafeAreaView } from 'react-native-safe-area-context'

import dynamicStyleSheet from './SafeScreenView.styles'
import type { SafeScreenViewProps } from './SafeScreenView.d'
import { useDynamicStyles } from '../../hooks'
import watermarkImage from '../../assets/WalletLogoMark.png'

export default function SafeScreenView({
  children,
  watermarkOpacity,
  ...rest
}: SafeScreenViewProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.contentContainer}
        style={styles.scrollView}
      >
        <SafeAreaView style={styles.screen} {...rest}>
          {children}
        </SafeAreaView>
      </KeyboardAwareScrollView>
      <Image
        source={watermarkImage}
        style={[
          styles.watermark,
          watermarkOpacity != null ? { opacity: watermarkOpacity } : null
        ]}
        accessible={false}
      />
    </View>
  )
}
