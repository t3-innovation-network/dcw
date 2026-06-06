import 'react-native-get-random-values'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WAS } from '../../app.config'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { ISigner } from '@interop/data-integrity-core'

export type IController = {
  signer?: ISigner
  did?: string
}

export async function getWasController(): Promise<IController> {
  if (!WAS.enabled) {
    console.log('Cannot get root signer, WAS disabled in config.')
    return {}
  }
  const rootSignerSerializedKeypair = await AsyncStorage.getItem(
    WAS.KEYS.SIGNER_KEYPAIR
  )
  if (!rootSignerSerializedKeypair) {
    console.log('Cannot get root signer, key pair not in storage.')
    return {}
  }
  const key = await Ed25519VerificationKey.from(
    JSON.parse(rootSignerSerializedKeypair)
  )

  const did =
    (await AsyncStorage.getItem(WAS.KEYS.SIGNER_CONTROLLER)) || undefined

  return { signer: key.signer(), did }
}
