import React from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View
} from 'react-native'
import {
  SafeAreaView,
  type NativeSafeAreaViewProps
} from 'react-native-safe-area-context'

import dynamicStyleSheet from './SafeScreenView.styles'
type SafeScreenViewProps = NativeSafeAreaViewProps & {
  children: React.ReactNode
  watermarkOpacity?: number
}
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
      {/*
       * Keep the focused input visible above the keyboard. On iOS the
       * KeyboardAvoidingView pads the scroll container; on Android the OS window
       * resize (adjustResize) handles it, so no behavior is needed there.
       */}
      <KeyboardAvoidingView
        style={styles.scrollView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.screen} {...rest}>
            {children}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
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
