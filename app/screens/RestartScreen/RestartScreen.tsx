import React, { useState } from 'react'
import { Text, Image } from 'react-native'
import { Button } from '@rneui/themed'
import * as Updates from 'expo-updates'

import dynamicStyleSheet from './RestartScreen.styles'
import { SafeScreenView } from '../../components'
import walletImage from '../../assets/wallet.png'
import appConfig from '../../../app.config'
import { useDynamicStyles } from '../../hooks'

export default function RestartScreen(): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const [restartFailed, setRestartFailed] = useState(false)

  async function restart() {
    try {
      // Reload the JS bundle to restart the app from a clean state. After a
      // wallet reset, this drops the user back at onboarding.
      await Updates.reloadAsync()
    } catch (err) {
      // reloadAsync rejects in some environments (e.g. development builds). Fall
      // back to asking the user to relaunch the app manually.
      console.error('Failed to restart the app:', err)
      setRestartFailed(true)
    }
  }

  return (
    <SafeScreenView style={styles.container}>
      <Image
        style={styles.image}
        source={walletImage}
        accessible
        accessibilityLabel={`${appConfig.displayName} Logo`}
      />
      <Text style={styles.title} accessibilityRole="header">
        Restart Application
      </Text>
      <Text style={styles.paragraph}>
        {restartFailed
          ? 'Please close the application, then re-open it.'
          : 'Your wallet has been reset. Tap below to restart and set up a new wallet.'}
      </Text>
      <Button
        buttonStyle={styles.buttonPrimary}
        containerStyle={styles.buttonPrimaryContainer}
        titleStyle={styles.buttonPrimaryTitle}
        title="Restart Now"
        onPress={restart}
      />
    </SafeScreenView>
  )
}
