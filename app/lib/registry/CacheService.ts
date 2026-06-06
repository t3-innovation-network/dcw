/**
 * Persistent cache tier for the registry layer.
 *
 * `CacheService` mirrors the `@interop/verifier-core` `CacheService` interface
 * (`get` / `set`, TTL-aware) so that a later swap to a cache-aware
 * `@interop/issuer-registry-client` collapses cleanly: the same persistent
 * store composes across both libraries. It is extended here with `has` and an
 * `allowStale` read option, which the `registryManager` needs to serve a
 * previously-fetched value while offline (the network refresh failed but the
 * cached entry, though past its TTL, is better than nothing).
 *
 * `AsyncStorageCacheService` is the React Native implementation, backed by
 * `@react-native-async-storage/async-storage`. It survives app restart, so a
 * warm start populates the in-memory tier from disk and previously-seen issuer
 * DIDs resolve offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Options for a cache read.
 */
export interface CacheGetOptions {
  /**
   * When true, return a value even if its TTL has elapsed. Used by the
   * registry layer to serve a stale entry when a fresh network lookup fails
   * (offline). Defaults to false.
   */
  allowStale?: boolean
}

/**
 * A small TTL-aware key/value cache. Mirrors `@interop/verifier-core`'s
 * `CacheService` (`get` / `set`) so the same store can later back the upstream
 * registry client; `has` and the `allowStale` read option are app-side
 * extensions for the offline-serving path.
 */
export interface CacheService {
  /**
   * Reads a cached value. Returns undefined when the key is absent or expired
   * (unless `allowStale` is set, in which case an expired value is returned).
   */
  get(key: string, options?: CacheGetOptions): Promise<unknown | undefined>
  /**
   * Writes a value with an optional time-to-live (milliseconds). When omitted,
   * the value never expires.
   */
  set(key: string, value: unknown, ttlMs?: number): Promise<void>
  /**
   * Returns true when an unexpired value is present for the key.
   */
  has(key: string): Promise<boolean>
}

/**
 * On-disk shape of a cached entry. `expiresAt` is an epoch-ms instant; null
 * means the entry never expires.
 */
interface StoredEntry {
  value: unknown
  expiresAt: number | null
}

/**
 * `CacheService` backed by `@react-native-async-storage/async-storage`. This is
 * the persistent tier of the registry layer -- it survives app restarts and
 * provides the offline-capable cache for previously-seen issuer DIDs.
 */
export class AsyncStorageCacheService implements CacheService {
  async get(
    key: string,
    options: CacheGetOptions = {}
  ): Promise<unknown | undefined> {
    let raw: string | null
    try {
      raw = await AsyncStorage.getItem(key)
    } catch {
      return undefined
    }
    if (raw === null) {
      return undefined
    }

    let entry: StoredEntry
    try {
      entry = JSON.parse(raw) as StoredEntry
    } catch {
      return undefined
    }

    const expired = entry.expiresAt !== null && entry.expiresAt <= Date.now()
    if (expired && !options.allowStale) {
      return undefined
    }
    return entry.value
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const entry: StoredEntry = {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    }
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry))
    } catch {
      // A failed persist is non-fatal -- the in-memory tier still serves the
      // value for the session.
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined
  }
}
