import { Buffer } from 'buffer'
import tar from 'tar-stream'
import uuid from 'react-native-uuid'
import YAML from 'yaml'
import {
  IDidDocument,
  IKeyPair,
  IVerifiableCredential
} from '@interop/data-integrity-core'

import { UBC } from '../../app.config'
import { ProfileMetadata } from '../types/profile'
import { UnlockedWallet, WalletContent } from '../types/wallet'
import { cidFrom } from './cid'

export const PROFILES_DIR = 'profiles'
export const CREDENTIALS_DIR = 'credentials'
export const MANIFEST_NAME = 'manifest.yml'

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

/**
 * Profile filenames are derived from the (slugified) profile name, so distinct
 * profiles whose names slugify identically (e.g. "Work" and "work") would
 * collide on the same `profiles/<slug>.json` path -- the second would overwrite
 * the first in the tar and be lost on import. Suffix collisions with a counter
 * (`work`, `work-2`, ...) to keep every profile's entry distinct. The real
 * profile name is carried in the file's JSON, so the filename is only an
 * identifier, not data.
 */
function uniqueProfileFileName(
  profileName: string,
  usedNames: Set<string>
): string {
  const base = profileFileName(profileName)
  let candidate = base
  let counter = 2
  while (usedNames.has(candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  usedNames.add(candidate)
  return candidate
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
  const usedProfileNames = new Set<string>()

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
      name: `${PROFILES_DIR}/${uniqueProfileFileName(input.profileName, usedProfileNames)}.json`,
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

function buildManifest(entries: TarEntry[]): string {
  const contents: Record<string, unknown> = {
    [MANIFEST_NAME]: { url: UBC.MANIFEST_URL }
  }

  for (const collection of [PROFILES_DIR, CREDENTIALS_DIR]) {
    const resources = entries
      .filter((entry) => entry.name.startsWith(`${collection}/`))
      .map((entry) => ({ [entry.name]: { url: UBC.RESOURCE_URL } }))

    if (resources.length === 0) continue

    contents[collection] = { url: UBC.COLLECTION_URL, contents: resources }
  }

  return YAML.stringify({ 'ubc-version': '0.1', contents })
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
  const allEntries: TarEntry[] = [
    { name: MANIFEST_NAME, data: buildManifest(entries) },
    ...entries
  ]
  const tarBuffer = await packTar(allEntries)
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
