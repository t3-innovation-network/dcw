import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  useFonts,
  Inter_700Bold as InterBold,
  Inter_700Bold
} from '@expo-google-fonts/inter'
import {
  SourceSans3_300Light,
  SourceSans3_400Regular,
  SourceSans3_700Bold
} from '@expo-google-fonts/source-sans-3'
import { RobotoMono_400Regular } from '@expo-google-fonts/roboto-mono'

import {
  lock,
  pollWalletState,
  selectWalletState
} from '../store/slices/wallet'
import { getAllRecords } from '../store'
import { useAppDispatch } from './useAppDispatch'
import { initializeLogger } from '../init/logger'
import { CredentialRecord } from '../model'
import { registryManager } from '../lib/registry/registryManager'

export function useAppLoading(): boolean {
  const [loading, setLoading] = useState(true)

  const { isUnlocked } = useSelector(selectWalletState)

  const primaryTasks = [useFontsLoaded(), useWalletStateInitialized()]

  const primaryTasksFinished = useMemo(
    () => primaryTasks.every((t) => t),
    primaryTasks
  )

  useEffect(() => {
    if (primaryTasksFinished) runSecondaryTasks()
  }, [primaryTasksFinished])

  async function runSecondaryTasks() {
    await Promise.all([initializeLogger(), warmRegistryCache()])

    setLoading(false)
  }

  /**
   * Pre-populates the registry lookup cache with the issuer DIDs of all stored
   * credentials, so those issuers resolve offline / instantly after a warm
   * start. Best-effort: not load-bearing for correctness (lookups are
   * read-through), and skipped when the wallet is locked.
   */
  async function warmRegistryCache() {
    if (!isUnlocked) return
    try {
      const records = await CredentialRecord.getAllCredentialRecords()
      const issuerDids = records
        .map((record) => issuerDidFromCredential(record.credential))
        .filter((did): did is string => !!did)
      await registryManager.warm(issuerDids)
    } catch (err) {
      console.warn('Registry cache warm skipped:', err)
    }
  }

  return loading
}

/**
 * Extracts an issuer DID from a credential, handling both the string and
 * `{ id }` object forms of the `issuer` property.
 */
function issuerDidFromCredential(credential: {
  issuer?: string | { id?: string }
}): string | undefined {
  const issuer = credential?.issuer
  if (typeof issuer === 'string') return issuer
  if (issuer && typeof issuer === 'object' && typeof issuer.id === 'string') {
    return issuer.id
  }
  return undefined
}

function useFontsLoaded() {
  const [fontsLoaded] = useFonts({
    Inter_700Bold,
    SourceSans3_300Light,
    SourceSans3_400Regular,
    SourceSans3_700Bold,
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
