/**
 * Shared, cached issuer-registry lookup layer.
 *
 * Wraps a single configured `@digitalcredentials/issuer-registry-client`
 * `RegistryClient` behind a small read-through cache, and is the one place the
 * app looks up "who is this issuer/requester DID". Both the verify pipeline
 * (via `issuerDetailsSuite`) and the standalone "who's asking" requester lookup
 * (`ShareHomeScreen`) call this singleton, so a single warm cache serves both.
 *
 * The 4.0.0 client is stateless-per-call: `lookupIssuersFor(did)` re-fetches
 * every configured registry document via bare `fetch` on every call and
 * discards it. To keep that off the hot path (and to work offline for
 * previously-seen DIDs), this layer adds two cache tiers in front of it:
 *
 *   - **L1** -- an in-memory `Map` of resolved `LookupResult`s. Synchronous,
 *     so `peekDid` can serve a render fast-path without awaiting.
 *   - **L2** -- a persistent `CacheService` (AsyncStorage). Survives restart;
 *     the offline-serving tier.
 *
 * The public API deliberately mirrors the intended future cache-aware
 * `@interop/issuer-registry-client`: when that fork lands (with the fetch /
 * cacheService / per-document caching seam upstreamed), this module collapses
 * to "construct the client with an AsyncStorage cache, delete the
 * orchestration". Persistence stays app-side regardless, since the library is
 * isomorphic.
 */
import {
  RegistryClient,
  type LookupResult
} from '@digitalcredentials/issuer-registry-client'
import type { EntityIdentityRegistry } from '@interop/verifier-core'
import { KnownDidRegistries } from '../../../app.config'
import { AsyncStorageCacheService, type CacheService } from './CacheService'

export type { LookupResult }

/** Lookup results are cached for 30 days (matching verification freshness). */
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

/** Namespace for the persistent (L2) cache keys. */
const CACHE_KEY_PREFIX = 'registry:lookup:'

/** An empty result -- the shape callers expect when nothing is known yet. */
const EMPTY_RESULT: LookupResult = {
  matchingIssuers: [],
  uncheckedRegistries: []
}

interface MemEntry {
  result: LookupResult
  expiresAt: number
}

let client: RegistryClient | undefined
let cacheService: CacheService = new AsyncStorageCacheService()
const memCache = new Map<string, MemEntry>()
const inFlight = new Map<string, Promise<LookupResult>>()

/**
 * Lazily constructs the singleton `RegistryClient`, configured from the
 * app-wide `KnownDidRegistries`. `use({ registries })` is synchronous in 4.0.0
 * (it only stores config), so this is cheap.
 */
function getClient(): RegistryClient {
  if (!client) {
    client = new RegistryClient()
    client.use({
      registries: KnownDidRegistries as unknown as EntityIdentityRegistry[]
    })
  }
  return client
}

function cacheKeyFor(did: string): string {
  return CACHE_KEY_PREFIX + did
}

function rememberInMemory(did: string, result: LookupResult): void {
  memCache.set(did, { result, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Resolves issuer metadata for a DID, read-through across both cache tiers:
 * L1 (in-memory) -> L2 (persistent) -> the network lookup. On a network
 * failure (e.g. offline), a stale L2 value is served when present; otherwise an
 * empty result is returned so callers degrade gracefully rather than throw.
 *
 * Concurrent calls for the same DID share one in-flight promise.
 */
async function lookupDid(did: string): Promise<LookupResult> {
  const live = memCache.get(did)
  if (live && live.expiresAt > Date.now()) {
    return live.result
  }

  const pending = inFlight.get(did)
  if (pending) {
    return pending
  }

  const key = cacheKeyFor(did)
  const promise = (async (): Promise<LookupResult> => {
    // L2: a fresh persistent hit short-circuits the network.
    const cached = (await cacheService.get(key)) as LookupResult | undefined
    if (cached) {
      rememberInMemory(did, cached)
      return cached
    }

    // Network: re-fetch via the client, then populate both tiers.
    try {
      const result = await getClient().lookupIssuersFor(did)
      rememberInMemory(did, result)
      void cacheService.set(key, result, CACHE_TTL_MS)
      return result
    } catch (err) {
      console.warn('Registry lookup failed for', did, err)
      // Offline / fetch failure: serve a stale persisted value if we have one.
      const stale = (await cacheService.get(key, { allowStale: true })) as
        | LookupResult
        | undefined
      if (stale) {
        rememberInMemory(did, stale)
        return stale
      }
      return EMPTY_RESULT
    }
  })()

  inFlight.set(did, promise)
  try {
    return await promise
  } finally {
    inFlight.delete(did)
  }
}

/**
 * Synchronous, cache-only lookup for render fast-paths. Returns the in-memory
 * (L1) result when present and unexpired, otherwise undefined. Never touches
 * the network or the (async) persistent tier.
 */
function peekDid(did: string): LookupResult | undefined {
  const live = memCache.get(did)
  if (live && live.expiresAt > Date.now()) {
    return live.result
  }
  return undefined
}

/**
 * Pre-populates the cache for a set of DIDs (typically the issuer DIDs of all
 * stored credentials, at startup). Each lookup is best-effort -- failures are
 * swallowed so a single bad DID can't reject the batch. Online this fetches
 * fresh; offline it warms L1 from L2 where possible.
 */
async function warm(dids: string[]): Promise<void> {
  const unique = Array.from(new Set(dids.filter(Boolean)))
  await Promise.all(
    unique.map((did) =>
      lookupDid(did).catch(() => {
        /* best-effort warm */
      })
    )
  )
}

/**
 * Resets the singleton's state and lets tests inject a fake client / cache.
 * Not used by app code.
 */
function reset(
  options: { client?: RegistryClient; cacheService?: CacheService } = {}
): void {
  client = options.client
  cacheService = options.cacheService ?? new AsyncStorageCacheService()
  memCache.clear()
  inFlight.clear()
}

export const registryManager = {
  lookupDid,
  peekDid,
  warm,
  /** Alias for {@link warm}; mirrors the intended upstream client method name. */
  prefetchDids: warm,
  reset
}
