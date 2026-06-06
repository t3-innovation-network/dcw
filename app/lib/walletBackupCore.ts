import { Buffer } from 'buffer'
import tar from 'tar-stream'
import uuid from 'react-native-uuid'
import {
  IDidDocument,
  IKeyPair,
  IVerifiableCredential
} from '@interop/data-integrity-core'

import { ProfileMetadata } from '../types/profile'
import { UnlockedWallet, WalletContent } from '../types/wallet'
import { cidFrom } from './cid'

export const PROFILES_DIR = 'profiles'
export const CREDENTIALS_DIR = 'credentials'

const WALLET_CONTEXTS = [
  'https://www.w3.org/2018/credentials/v1',
  'https://w3id.org/wallet/v1'
] as const

export type ExportedProfile = {
  profileName: string
  didDocument: IDidDocument
  verificationKey: IKeyPair
  credentialCids: string[]
}

/**
 * Plain, model-free description of a profile to back up. The model layer
 * (`walletBackup.ts`) gathers these from Realm; everything below operates only
 * on this shape so the pack/extract/round-trip logic stays testable in Node.
 */
export type ProfileBackupInput = {
  profileName: string
  didDocument: IDidDocument
  verificationKey: IKeyPair
  credentials: IVerifiableCredential[]
}

type TarEntry = { name: string; data: string }

function profileFileName(profileName: string): string {
  const slug = profileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'profile'
}

function toUnlockedWallet(
  profile: ExportedProfile,
  credentials: IVerifiableCredential[]
): string {
  const profileMetadata: ProfileMetadata = {
    '@context': ['https://w3id.org/wallet/v1'],
    id: `urn:uuid:${uuid.v4()}`,
    type: 'ProfileMetadata',
    data: { profileName: profile.profileName }
  }

  const contents: WalletContent[] = [
    ...credentials,
    profile.didDocument,
    profile.verificationKey,
    profileMetadata
  ]

  const wallet: UnlockedWallet = {
    '@context': WALLET_CONTEXTS as unknown as string[],
    id: `urn:uuid:${uuid.v4()}`,
    type: 'UniversalWallet2020',
    status: 'UNLOCKED',
    contents
  }

  return JSON.stringify(wallet)
}

async function gatherTarEntries(
  inputs: ProfileBackupInput[]
): Promise<TarEntry[]> {
  const entries: TarEntry[] = []
  const addedCredentialCids = new Set<string>()

  for (const input of inputs) {
    const credentialCids = await Promise.all(
      input.credentials.map((credential) => cidFrom({ doc: credential }))
    )

    const exportedProfile: ExportedProfile = {
      profileName: input.profileName,
      didDocument: input.didDocument,
      verificationKey: input.verificationKey,
      credentialCids
    }

    entries.push({
      name: `${PROFILES_DIR}/${profileFileName(input.profileName)}.json`,
      data: JSON.stringify(exportedProfile, null, 2)
    })

    for (let i = 0; i < input.credentials.length; i++) {
      const cid = credentialCids[i]
      if (addedCredentialCids.has(cid)) continue

      entries.push({
        name: `${CREDENTIALS_DIR}/${cid}.json`,
        data: JSON.stringify(input.credentials[i], null, 2)
      })
      addedCredentialCids.add(cid)
    }
  }

  return entries
}

function packTar(entries: TarEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pack = tar.pack()
    const chunks: Buffer[] = []

    pack.on('data', (chunk: Buffer) => chunks.push(chunk))
    pack.on('end', () => resolve(Buffer.concat(chunks)))
    pack.on('error', reject)

    let pending = entries.length

    if (pending === 0) {
      pack.finalize()
      return
    }

    for (const { name, data } of entries) {
      pack.entry({ name }, data, (err) => {
        if (err) {
          reject(err)
          return
        }
        pending -= 1
        if (pending === 0) pack.finalize()
      })
    }
  })
}

export function extractTar(tarBuffer: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract()
    const files = new Map<string, Buffer>()

    extract.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        files.set(header.name, Buffer.concat(chunks))
        next()
      })
      stream.on('error', reject)
    })
    extract.on('finish', () => resolve(files))
    extract.on('error', reject)

    extract.end(tarBuffer)
  })
}

export async function buildWalletTarFromInputs(
  inputs: ProfileBackupInput[]
): Promise<string> {
  const entries = await gatherTarEntries(inputs)
  const tarBuffer = await packTar(entries)
  return tarBuffer.toString('base64')
}

export async function unlockedWalletsFromTar(
  base64Tar: string
): Promise<string[]> {
  const files = await extractTar(Buffer.from(base64Tar, 'base64'))

  const credentialsByCid = new Map<string, IVerifiableCredential>()
  for (const [path, content] of files) {
    if (!path.startsWith(`${CREDENTIALS_DIR}/`)) continue
    const cid = path.slice(`${CREDENTIALS_DIR}/`.length).replace(/\.json$/, '')
    credentialsByCid.set(cid, JSON.parse(content.toString('utf8')))
  }

  const wallets: string[] = []
  for (const [path, content] of files) {
    if (!path.startsWith(`${PROFILES_DIR}/`)) continue

    const profile: ExportedProfile = JSON.parse(content.toString('utf8'))
    const credentials = profile.credentialCids
      .map((cid) => credentialsByCid.get(cid))
      .filter((credential): credential is IVerifiableCredential =>
        Boolean(credential)
      )

    wallets.push(toUnlockedWallet(profile, credentials))
  }

  return wallets
}
