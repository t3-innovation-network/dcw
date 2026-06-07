import {
  CredentialRecord,
  DidRecord,
  ProfileRecord,
  ProfileRecordRaw
} from '../model'
import {
  buildWalletTarFromInputs,
  ProfileBackupInput
} from './walletBackupCore'

export type { ExportedProfile, ProfileBackupInput } from './walletBackupCore'
export { unlockedWalletsFromTar } from './walletBackupCore'

async function gatherProfileBackupInputs(
  profiles: ProfileRecordRaw[]
): Promise<ProfileBackupInput[]> {
  const [allCredentials, allDidRecords] = await Promise.all([
    CredentialRecord.getAllCredentialRecords(),
    DidRecord.getAllDidRecords()
  ])

  return profiles.map((profile) => {
    const didRecord = allDidRecords.find(
      ({ _id }) => _id === profile.didRecordId
    )
    if (!didRecord) {
      throw new Error(
        `No DID record found for profile "${profile.profileName}"`
      )
    }

    const credentials = allCredentials
      .filter(({ profileRecordId }) => profileRecordId === profile._id)
      .map(({ credential }) => credential)

    return {
      profileName: profile.profileName,
      didDocument: didRecord.didDocument,
      verificationKey: didRecord.verificationKey,
      credentials
    }
  })
}

export async function buildWalletTar(
  profiles: ProfileRecordRaw[]
): Promise<string> {
  return buildWalletTarFromInputs(await gatherProfileBackupInputs(profiles))
}

export async function buildProfileTar(
  rawProfileRecord: ProfileRecordRaw
): Promise<string> {
  return buildWalletTar([rawProfileRecord])
}

export async function buildFullWalletTar(): Promise<string> {
  const profiles = await ProfileRecord.getAllProfileRecords()
  return buildWalletTar(profiles)
}
