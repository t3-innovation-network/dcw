import uuid from 'react-native-uuid'
import { generateSecureRandom } from 'react-native-securerandom'

import { db } from './DatabaseAccess'
import { CREDENTIALS_TABLE, DIDS_TABLE, PROFILES_TABLE } from './schema'

import { getCredentialName } from '../lib/credentialName'
import { UnlockedWallet } from '../types/wallet'
import { ProfileImportReport, ProfileMetadata } from '../types/profile'
import { parseWalletContents } from '../lib/parseWallet'
import { HumanReadableError } from '../lib/error'
import { CredentialRecord } from './credential'
import { DidRecord, DidRecordRaw } from './did'
import { CredentialRecordRaw } from '../types/credential'
import { credentialContentHash } from '../lib/credentialHash'
import { mintDid } from '../lib/did'

const UNTITLED_PROFILE_NAME = 'Untitled Profile'
export const INITIAL_PROFILE_NAME = 'Default'

const WALLET_CONTEXTS = [
  'https://www.w3.org/2018/credentials/v1',
  'https://w3id.org/wallet/v1'
] as const
function generateWalletUrnId(): string {
  return `urn:uuid:${uuid.v4()}`
}

// Helper function to check if profile names are case-insensitively equal
function isProfileNameDuplicate(
  existingName: string,
  newName: string
): boolean {
  return existingName.toLowerCase() === newName.toLowerCase()
}

export type ProfileRecordRaw = {
  readonly _id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly profileName: string
  readonly didRecordId: string
}

export type ProfileWithCredentialRecords = ProfileRecordRaw & {
  rawCredentialRecords: CredentialRecordRaw[]
}

/** Shape of a row as stored in / read from the `profiles` table. */
type ProfileRow = {
  _id: string
  createdAt: string
  updatedAt: string
  profileName: string
  didRecordId: string
}

function rowToRaw(row: ProfileRow): ProfileRecordRaw {
  return {
    _id: row._id,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    profileName: row.profileName,
    didRecordId: row.didRecordId
  }
}

export class ProfileRecord {
  public static rawFrom({
    profileName,
    rawDidRecord
  }: Required<AddProfileRecordParams>): ProfileRecordRaw {
    return {
      _id: uuid.v4() as string,
      createdAt: new Date(),
      updatedAt: new Date(),
      profileName,
      didRecordId: rawDidRecord._id
    }
  }

  public static async addProfileRecord({
    profileName,
    rawDidRecord
  }: AddProfileRecordParams): Promise<ProfileRecordRaw> {
    // Check for duplicate profile names (case-insensitive)
    const existingProfiles = await ProfileRecord.getAllProfileRecords()
    const isDuplicate = existingProfiles.some((profile) =>
      isProfileNameDuplicate(profile.profileName, profileName)
    )

    if (isDuplicate) {
      throw new HumanReadableError(
        `A profile with the name "${profileName}" already exists. Please choose a different name.`
      )
    }

    if (rawDidRecord === undefined) {
      // No DID record passed in -- generate a new one from random seed
      const randomSeed = await generateSecureRandom(32)
      const didPayload = await mintDid({ seed: randomSeed })
      rawDidRecord = await DidRecord.addDidRecord(didPayload)
    }

    const raw = ProfileRecord.rawFrom({
      profileName,
      rawDidRecord
    })

    await db.withInstance((instance) =>
      instance.runAsync(
        `INSERT INTO ${PROFILES_TABLE}
          (_id, createdAt, updatedAt, profileName, didRecordId)
          VALUES (?, ?, ?, ?, ?)`,
        [
          raw._id,
          raw.createdAt.toISOString(),
          raw.updatedAt.toISOString(),
          raw.profileName,
          raw.didRecordId
        ]
      )
    )

    return raw
  }

  public static async getAllProfileRecords(): Promise<ProfileRecordRaw[]> {
    return db.withInstance(async (instance) => {
      const rows = await instance.getAllAsync<ProfileRow>(
        `SELECT * FROM ${PROFILES_TABLE}`
      )
      return rows.map(rowToRaw)
    })
  }

  public static async updateProfileRecord(
    rawProfileRecord: ProfileRecordRaw
  ): Promise<ProfileRecordRaw> {
    // Prevent duplicate profile names on update (case-insensitive), excluding the current record
    const existingProfiles = await ProfileRecord.getAllProfileRecords()
    const isDuplicate = existingProfiles.some(
      (profile) =>
        profile._id !== rawProfileRecord._id &&
        isProfileNameDuplicate(
          profile.profileName,
          rawProfileRecord.profileName
        )
    )

    if (isDuplicate) {
      throw new HumanReadableError(
        `A profile with the name "${rawProfileRecord.profileName}" already exists. Please choose a different name.`
      )
    }

    // Ensure updatedAt is refreshed on rename/update
    const updated: ProfileRecordRaw = {
      ...rawProfileRecord,
      updatedAt: new Date()
    }

    await db.withInstance((instance) =>
      instance.runAsync(
        `INSERT INTO ${PROFILES_TABLE}
          (_id, createdAt, updatedAt, profileName, didRecordId)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(_id) DO UPDATE SET
            updatedAt = excluded.updatedAt,
            profileName = excluded.profileName,
            didRecordId = excluded.didRecordId`,
        [
          updated._id,
          updated.createdAt.toISOString(),
          updated.updatedAt.toISOString(),
          updated.profileName,
          updated.didRecordId
        ]
      )
    )

    return updated
  }

  public static async deleteProfileRecord(
    rawProfileRecord: ProfileRecordRaw
  ): Promise<void> {
    const rawProfileRecords = await ProfileRecord.getAllProfileRecords()
    if (rawProfileRecords.length <= 1) {
      throw new HumanReadableError(
        'You are unable to delete this profile as your wallet must have at least one profile. If you want to delete the contents of your wallet, please select Reset Wallet from the Settings Menu.'
      )
    }

    // Cascade: remove the profile, its DID record, and all of its credentials
    // atomically.
    await db.withInstance(async (instance) => {
      await instance.withTransactionAsync(async () => {
        await instance.runAsync(
          `DELETE FROM ${CREDENTIALS_TABLE} WHERE profileRecordId = ?`,
          [rawProfileRecord._id]
        )
        await instance.runAsync(`DELETE FROM ${DIDS_TABLE} WHERE _id = ?`, [
          rawProfileRecord.didRecordId
        ])
        await instance.runAsync(`DELETE FROM ${PROFILES_TABLE} WHERE _id = ?`, [
          rawProfileRecord._id
        ])
      })
    })
  }

  public static async exportProfileRecord(
    rawProfileRecord: ProfileRecordRaw
  ): Promise<UnlockedWallet> {
    const { profileName } = rawProfileRecord

    const allCredentialRecords =
      await CredentialRecord.getAllCredentialRecords()
    const profileCredentialRecords = allCredentialRecords.filter(
      ({ profileRecordId }) => profileRecordId === rawProfileRecord._id
    )
    const credentials = profileCredentialRecords.map(
      ({ credential }) => credential
    )

    const allDidRecords = await DidRecord.getAllDidRecords()
    const profileDidRecord = allDidRecords.find(
      ({ _id }) => _id === rawProfileRecord.didRecordId
    )

    if (profileDidRecord === undefined) {
      throw new Error('No DID record found for profile')
    }

    const { didDocument, verificationKey } = profileDidRecord

    const profileMetadata: ProfileMetadata = {
      '@context': ['https://w3id.org/wallet/v1'],
      id: `urn:uuid:${uuid.v4()}`,
      type: 'ProfileMetadata',
      data: {
        profileName
      }
    }

    const contents = [
      ...credentials,
      didDocument,
      verificationKey,
      profileMetadata
    ]

    const profile: UnlockedWallet = {
      '@context': WALLET_CONTEXTS as unknown as string[],
      id: generateWalletUrnId(),
      type: 'UniversalWallet2020',
      status: 'UNLOCKED',
      contents
    }

    return profile
  }

  public static async importProfileRecord(
    rawWallet: string
  ): Promise<ProfileImportReport> {
    const { credentials, didDocument, verificationKey, profileMetadata } =
      parseWalletContents(rawWallet)

    const profileImportReport: ProfileImportReport = {
      userIdImported: false,
      profileDuplicate: false,
      credentials: {
        success: [],
        duplicate: [],
        failed: []
      }
    }

    try {
      const { profileName = UNTITLED_PROFILE_NAME } =
        profileMetadata?.data ?? {}

      // Check if profile with same name already exists (case-insensitive)
      const existingProfiles = await ProfileRecord.getAllProfileRecords()
      const existingProfile = existingProfiles.find((profile) =>
        isProfileNameDuplicate(profile.profileName, profileName)
      )

      if (existingProfile) {
        // Skip profile creation but still process credentials for existing profile
        const profileRecordId = existingProfile._id
        profileImportReport.userIdImported = false // Profile already exists
        profileImportReport.profileDuplicate = true

        const existingCredentials =
          await CredentialRecord.getAllCredentialRecords()
        const profileCredentialHashes = existingCredentials
          .filter(
            ({ profileRecordId: credProfileId }) =>
              credProfileId === profileRecordId
          )
          .map(({ credential }) => credentialContentHash(credential))

        await Promise.all(
          credentials.map(async (credential) => {
            const credentialName = getCredentialName(credential)
            if (
              profileCredentialHashes.includes(
                credentialContentHash(credential)
              )
            ) {
              profileImportReport.credentials.duplicate.push(credentialName)
              return
            }

            try {
              await CredentialRecord.addCredentialRecord({
                credential,
                profileRecordId
              })
              profileImportReport.credentials.success.push(credentialName)
            } catch (err) {
              console.warn(`Unable to import credential: ${err}`)
              profileImportReport.credentials.failed.push(credentialName)
            }
          })
        )

        return profileImportReport
      }

      const rawDidRecord = await DidRecord.addDidRecord({
        didDocument,
        verificationKey
      })
      const rawProfileRecord = await ProfileRecord.addProfileRecord({
        profileName,
        rawDidRecord
      })
      const profileRecordId = rawProfileRecord._id

      profileImportReport.userIdImported = true

      await Promise.all(
        credentials.map(async (credential) => {
          const credentialName = getCredentialName(credential)

          try {
            await CredentialRecord.addCredentialRecord({
              credential,
              profileRecordId
            })
            profileImportReport.credentials.success.push(credentialName)
          } catch (err) {
            console.warn(`Unable to import credential: ${err}`)
            profileImportReport.credentials.failed.push(credentialName)
          }
        })
      )
    } catch (err) {
      console.warn(`Unable to import profile: ${err}`)
    }

    return profileImportReport
  }
}

export type AddProfileRecordParams = {
  profileName: string
  rawDidRecord?: DidRecordRaw
}
