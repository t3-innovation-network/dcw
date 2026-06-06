import { it, describe } from 'node:test'
import assert from 'node:assert'
import { Buffer } from 'buffer'
import { cidFrom } from '../app/lib/cid'
import {
  CREDENTIALS_DIR,
  PROFILES_DIR,
  ProfileBackupInput,
  buildWalletTarFromInputs,
  extractTar,
  unlockedWalletsFromTar
} from '../app/lib/walletBackupCore'

function makeCredential(subjectId: string) {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    issuer: 'did:example:issuer',
    credentialSubject: { id: subjectId, name: `Cred for ${subjectId}` }
  }
}

function makeProfile(
  profileName: string,
  didId: string,
  credentials: ReturnType<typeof makeCredential>[]
): ProfileBackupInput {
  return {
    profileName,
    didDocument: {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: didId
    } as ProfileBackupInput['didDocument'],
    verificationKey: {
      id: `${didId}#key`,
      type: 'Ed25519VerificationKey2020',
      controller: didId,
      publicKeyMultibase: 'z6MkExample'
    } as ProfileBackupInput['verificationKey'],
    credentials: credentials as unknown as ProfileBackupInput['credentials']
  }
}

function credentialFilenames(files: Map<string, Buffer>): string[] {
  return [...files.keys()].filter((name) =>
    name.startsWith(`${CREDENTIALS_DIR}/`)
  )
}

describe('wallet backup tar', () => {
  it('uses CID filenames in credentials/ and profile refs in profiles/', async () => {
    const credential = makeCredential('did:example:subject')
    const cid = await cidFrom({ doc: credential })

    const base64Tar = await buildWalletTarFromInputs([
      makeProfile('Default', 'did:key:z6MkDefault', [credential])
    ])

    const files = await extractTar(Buffer.from(base64Tar, 'base64'))
    assert.ok(files.has(`${PROFILES_DIR}/default.json`))
    assert.ok(files.has(`${CREDENTIALS_DIR}/${cid}.json`))

    const profile = JSON.parse(
      files.get(`${PROFILES_DIR}/default.json`)!.toString('utf8')
    )
    assert.deepEqual(profile.credentialCids, [cid])
  })

  it('round-trips export to import, preserving profile contents', async () => {
    const credA = makeCredential('did:example:a')
    const credB = makeCredential('did:example:b')

    const base64Tar = await buildWalletTarFromInputs([
      makeProfile('My Profile', 'did:key:z6MkRoundTrip', [credA, credB])
    ])

    const wallets = await unlockedWalletsFromTar(base64Tar)
    assert.equal(wallets.length, 1)

    const wallet = JSON.parse(wallets[0])
    assert.equal(wallet.type, 'UniversalWallet2020')
    assert.equal(wallet.status, 'UNLOCKED')

    const contents = wallet.contents as Array<Record<string, unknown>>

    const credentials = contents.filter((item) =>
      (item.type as string[])?.includes?.('VerifiableCredential')
    )
    assert.equal(credentials.length, 2)
    assert.deepEqual(
      credentials.sort(bySubjectId),
      [credA, credB].sort(bySubjectId)
    )

    const didDocument = contents.find(
      (item) => item.id === 'did:key:z6MkRoundTrip'
    )
    assert.ok(didDocument, 'DID document present in wallet contents')

    const verificationKey = contents.find(
      (item) => item.id === 'did:key:z6MkRoundTrip#key'
    )
    assert.ok(verificationKey, 'verification key present in wallet contents')

    const profileMetadata = contents.find(
      (item) => item.type === 'ProfileMetadata'
    )
    assert.ok(profileMetadata, 'profile metadata present in wallet contents')
    assert.equal(
      (profileMetadata!.data as { profileName: string }).profileName,
      'My Profile'
    )
  })

  it('deduplicates a credential shared across profiles', async () => {
    const shared = makeCredential('did:example:shared')
    const uniqueToB = makeCredential('did:example:onlyB')

    const base64Tar = await buildWalletTarFromInputs([
      makeProfile('Profile A', 'did:key:z6MkA', [shared]),
      makeProfile('Profile B', 'did:key:z6MkB', [shared, uniqueToB])
    ])

    const files = await extractTar(Buffer.from(base64Tar, 'base64'))

    // Shared credential stored once: two unique CIDs total, not three.
    const sharedCid = await cidFrom({ doc: shared })
    const uniqueCid = await cidFrom({ doc: uniqueToB })
    assert.deepEqual(
      credentialFilenames(files).sort(),
      [
        `${CREDENTIALS_DIR}/${sharedCid}.json`,
        `${CREDENTIALS_DIR}/${uniqueCid}.json`
      ].sort()
    )

    // Both profiles still reference the shared credential by CID.
    const profileA = JSON.parse(
      files.get(`${PROFILES_DIR}/profile-a.json`)!.toString('utf8')
    )
    const profileB = JSON.parse(
      files.get(`${PROFILES_DIR}/profile-b.json`)!.toString('utf8')
    )
    assert.deepEqual(profileA.credentialCids, [sharedCid])
    assert.deepEqual(profileB.credentialCids, [sharedCid, uniqueCid])

    // On import, both profiles get the shared credential back.
    const wallets = await unlockedWalletsFromTar(base64Tar)
    assert.equal(wallets.length, 2)
    for (const raw of wallets) {
      const contents = JSON.parse(raw).contents as Array<
        Record<string, unknown>
      >
      const hasShared = contents.some(
        (item) =>
          (item.credentialSubject as { id?: string })?.id ===
          'did:example:shared'
      )
      assert.ok(hasShared, 'shared credential restored in each wallet')
    }
  })
})

function bySubjectId(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): number {
  const idA = (a.credentialSubject as { id: string }).id
  const idB = (b.credentialSubject as { id: string }).id
  return idA.localeCompare(idB)
}
