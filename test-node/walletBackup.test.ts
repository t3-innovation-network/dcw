import { it, describe } from 'node:test'
import assert from 'node:assert'
import { Buffer } from 'buffer'
import tar from 'tar-stream'
import { cidFrom } from '../app/lib/cid'

function packTar(entries: { name: string; data: string }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pack = tar.pack()
    const chunks: Buffer[] = []

    pack.on('data', (chunk: Buffer) => chunks.push(chunk))
    pack.on('end', () => resolve(Buffer.concat(chunks)))
    pack.on('error', reject)

    let pending = entries.length
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

function extractTar(tarBuffer: Buffer): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract()
    const files = new Map<string, string>()

    extract.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        files.set(header.name, Buffer.concat(chunks).toString('utf8'))
        next()
      })
      stream.on('error', reject)
    })
    extract.on('finish', () => resolve(files))
    extract.on('error', reject)

    extract.end(tarBuffer)
  })
}

describe('wallet backup layout', () => {
  it('uses CID filenames in credentials/ and profile refs in profiles/', async () => {
    const credential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: 'did:example:issuer',
      credentialSubject: { id: 'did:example:subject' }
    }
    const cid = await cidFrom({ doc: credential })

    const profile = {
      profileName: 'Default',
      didDocument: { '@context': ['https://www.w3.org/ns/did/v1'], id: 'did:key:z6Mk' },
      verificationKey: {
        id: 'did:key:z6Mk#z6Mk',
        type: 'Ed25519VerificationKey2020',
        controller: 'did:key:z6Mk',
        publicKeyMultibase: 'z6Mk'
      },
      credentialCids: [cid]
    }

    const tarBuffer = await packTar([
      { name: 'profiles/default.json', data: JSON.stringify(profile) },
      { name: `credentials/${cid}.json`, data: JSON.stringify(credential) }
    ])

    const files = await extractTar(tarBuffer)
    assert.ok(files.has('profiles/default.json'))
    assert.ok(files.has(`credentials/${cid}.json`))

    const parsedProfile = JSON.parse(files.get('profiles/default.json')!)
    assert.deepEqual(parsedProfile.credentialCids, [cid])
  })
})
