/**
 * Tests the cached registry layer: L1 hit, network miss + populate, L2 hit,
 * stale-on-offline, and the synchronous peek fast-path. The real
 * RegistryClient and AsyncStorage are mocked away (issuer-registry-client is
 * ESM; AsyncStorage is native), and fakes are injected via `reset()`.
 */
jest.mock('@digitalcredentials/issuer-registry-client', () => ({
  RegistryClient: class {
    use() {
      /* no-op */
    }
    async lookupIssuersFor() {
      return { matchingIssuers: [], uncheckedRegistries: [] }
    }
  }
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}))

import { registryManager } from '../app/lib/registry/registryManager'

const DID = 'did:web:example.edu'
const RESULT = {
  matchingIssuers: [{ issuer: { name: 'Example' } }],
  uncheckedRegistries: []
}

type FakeCache = { get: jest.Mock; set: jest.Mock; has: jest.Mock }

const makeClient = (lookup: jest.Mock) =>
  ({ use: jest.fn(), lookupIssuersFor: lookup }) as never

const makeCache = (overrides: Partial<FakeCache> = {}): FakeCache => ({
  get: jest.fn(async () => undefined),
  set: jest.fn(async () => undefined),
  has: jest.fn(async () => false),
  ...overrides
})

describe('registryManager', () => {
  it('fetches on a miss, then serves L1 (in-memory) without re-fetching', async () => {
    const lookup = jest.fn().mockResolvedValue(RESULT)
    const cache = makeCache()
    registryManager.reset({ client: makeClient(lookup), cacheService: cache })

    const first = await registryManager.lookupDid(DID)
    const second = await registryManager.lookupDid(DID)

    expect(first).toEqual(RESULT)
    expect(second).toEqual(RESULT)
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(cache.set).toHaveBeenCalled()
  })

  it('serves a fresh L2 (persistent) hit without hitting the network', async () => {
    const lookup = jest.fn().mockResolvedValue(RESULT)
    const cache = makeCache({ get: jest.fn(async () => RESULT) })
    registryManager.reset({ client: makeClient(lookup), cacheService: cache })

    const result = await registryManager.lookupDid(DID)

    expect(result).toEqual(RESULT)
    expect(lookup).not.toHaveBeenCalled()
  })

  it('serves a stale L2 value when the network lookup fails (offline)', async () => {
    const lookup = jest.fn().mockRejectedValue(new Error('offline'))
    // Fresh read misses; stale read (allowStale) returns the cached value.
    const get = jest.fn(
      async (_key: string, opts?: { allowStale?: boolean }) =>
        opts?.allowStale ? RESULT : undefined
    )
    const cache = makeCache({ get })
    registryManager.reset({ client: makeClient(lookup), cacheService: cache })

    const result = await registryManager.lookupDid(DID)

    expect(result).toEqual(RESULT)
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it('returns an empty result when offline with no cached value', async () => {
    const lookup = jest.fn().mockRejectedValue(new Error('offline'))
    const cache = makeCache()
    registryManager.reset({ client: makeClient(lookup), cacheService: cache })

    const result = await registryManager.lookupDid(DID)

    expect(result).toEqual({ matchingIssuers: [], uncheckedRegistries: [] })
  })

  it('peekDid returns undefined before a lookup and the value after', async () => {
    const lookup = jest.fn().mockResolvedValue(RESULT)
    registryManager.reset({
      client: makeClient(lookup),
      cacheService: makeCache()
    })

    expect(registryManager.peekDid(DID)).toBeUndefined()

    await registryManager.lookupDid(DID)

    expect(registryManager.peekDid(DID)).toEqual(RESULT)
  })

  it('warm pre-populates the cache for the given DIDs', async () => {
    const lookup = jest.fn().mockResolvedValue(RESULT)
    registryManager.reset({
      client: makeClient(lookup),
      cacheService: makeCache()
    })

    await registryManager.warm([DID, '', DID])

    // Deduped + empty filtered -> a single fetch; the value is now peekable.
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(registryManager.peekDid(DID)).toEqual(RESULT)
  })
})
