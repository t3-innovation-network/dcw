import { useEffect, useMemo, useState, useContext } from 'react'
import { useSelector } from 'react-redux'
import {
  useFonts,
  Inter_700Bold as InterBold,
  Inter_700Bold
} from '@expo-google-fonts/inter'
import {
  SourceSansPro_300Light,
  SourceSansPro_400Regular,
  SourceSansPro_700Bold
} from '@expo-google-fonts/source-sans-pro'
import { RobotoMono_400Regular } from '@expo-google-fonts/roboto-mono'

import { DidRegistryContext, loadKnownDidRegistries } from '../init/registries'
import {
  lock,
  pollWalletState,
  selectWalletState
} from '../store/slices/wallet'
import { getAllRecords } from '../store'
import { useAppDispatch } from './useAppDispatch'
import { initializeLogger } from '../init/logger'

export function useAppLoading(): boolean {
  const [loading, setLoading] = useState(true)

  const didRegistries = useContext(DidRegistryContext)

  const primaryTasks = [useFontsLoaded(), useWalletStateInitialized()]

  const primaryTasksFinished = useMemo(
    () => primaryTasks.every((t) => t),
    primaryTasks
  )

  useEffect(() => {
    if (primaryTasksFinished) runSecondaryTasks()
  }, [primaryTasksFinished])

  async function runSecondaryTasks() {
    await Promise.all([
      initializeLogger(),
      loadKnownDidRegistries({ client: didRegistries })
    ])

    setLoading(false)
  }

  return loading
}

function useFontsLoaded() {
  const [fontsLoaded] = useFonts({
    Inter_700Bold,
    SourceSansPro_300Light,
    SourceSansPro_400Regular,
    SourceSansPro_700Bold,
    RobotoMono_400Regular
  })

  return fontsLoaded
}

function useWalletStateInitialized() {
  const dispatch = useAppDispatch()

  const { isUnlocked, isInitialized } = useSelector(selectWalletState)
  const walletStateInitialized = isUnlocked !== null && isInitialized !== null

  useEffect(() => {
    if (!walletStateInitialized) {
      dispatch(pollWalletState())
    } else {
      /**
       * SecureStore items aren't removed when the app is deleted, so if the
       * database status is unlocked but not initialized, we need to update the
       * status to locked.
       */
      if (isUnlocked && !isInitialized) {
        dispatch(lock())
      } else if (isUnlocked) {
        dispatch(getAllRecords())
      }
    }
  }, [walletStateInitialized])

  return walletStateInitialized
}
