import React, { useMemo } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import RootNavigation from '../RootNavigation/RootNavigation'
import SetupNavigation from '../SetupNavigation/SetupNavigation'
import { RestartScreen, LoginScreen } from '../../screens'
import { useAppLoading, useDynamicStyles } from '../../hooks'
import { selectWalletState } from '../../store/slices/wallet'
import { EventProvider } from 'react-native-outside-press'
import { deepLinkConfig } from '../../lib/deepLinkConfig'
import GlobalConfirmModal from '../../components/GlobalConfirmModal/GlobalConfirmModal'
import { navigationRef } from '../navigationRef'
import { View, Image, StyleSheet } from 'react-native'
import watermarkImage from '../../assets/WalletLogoMark.png'

export { navigationRef }

SplashScreen.preventAutoHideAsync()

export default function AppNavigation(): React.ReactElement | null {
  const { mixins, theme } = useDynamicStyles()
  const [isSetupRoute, setIsSetupRoute] = React.useState(false)
  const [isSettingsRoute, setIsSettingsRoute] = React.useState(false)

  const navigatorTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: theme.color.backgroundPrimary
      }
    }),
    [theme]
  )

  const loading = useAppLoading()
  const { isUnlocked, isInitialized, needsRestart } =
    useSelector(selectWalletState)

  function renderScreen(): React.ReactElement | null {
    if (needsRestart) {
      return <RestartScreen />
    } else if (isUnlocked && isInitialized) {
      return <RootNavigation />
    } else if (!isUnlocked && isInitialized) {
      return <LoginScreen />
    } else if (!isUnlocked && !isInitialized) {
      return <SetupNavigation />
    } else {
      return null
    }
  }

  if (loading) {
    return <GlobalConfirmModal />
  }

  function updateRouteForWatermark() {
    if (!navigationRef.isReady()) return
    const route = navigationRef.getCurrentRoute()
    const name = route?.name ?? ''
    console.log('🚀 ~ updateRouteForWatermark ~ name:', name)
    const isSetup = name.includes('StartStep')
    setIsSetupRoute(isSetup)
    setIsSettingsRoute(name.includes('Settings'))
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.statusBarStyle} />
      <GlobalConfirmModal />
      <EventProvider style={mixins.flex}>
        <WaterMarkProvider
          isSetupRoute={isSetupRoute}
          isSettingsRoute={isSettingsRoute}
        >
          <NavigationContainer
            onReady={() => {
              SplashScreen.hideAsync()
              updateRouteForWatermark()
            }}
            theme={navigatorTheme}
            ref={navigationRef}
            linking={deepLinkConfig}
            onStateChange={updateRouteForWatermark}
          >
            {renderScreen()}
          </NavigationContainer>
        </WaterMarkProvider>
      </EventProvider>
    </SafeAreaProvider>
  )
}

export function WaterMarkProvider({
  children,
  isSetupRoute,
  isSettingsRoute
}: {
  children: React.ReactNode
  isSetupRoute: boolean
  isSettingsRoute: boolean
}): React.ReactElement {
  return (
    <View style={styles.container}>
      {children}
      {/* Watermark overlay */}
      <View pointerEvents="none" style={styles.overlay}>
        <Image
          source={watermarkImage}
          accessible={false}
          style={[
            styles.image,
            {
              opacity: isSetupRoute ? 1 : 0.1,
              bottom: isSetupRoute ? -80 : 0,
              display: isSettingsRoute ? 'none' : 'flex'
            }
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  image: {
    width: '100%',
    height: 220,
    marginBottom: 80,
    resizeMode: 'cover'
  }
})
