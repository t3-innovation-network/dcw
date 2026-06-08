import AsyncStorage from '@react-native-async-storage/async-storage'

export enum CacheKey {
  // view, get, and unshare links
  PublicLinks = 'publiclinks'
}

// All cache entries are namespaced under this prefix so the cache can be cleared
// (in whole or by key) without touching the other AsyncStorage data the app
// keeps (theme, WAS controller, etc.). Per-item key: `${PREFIX}:${key}:${id}`.
const CACHE_PREFIX = '@dcw-cache'

type CacheEnvelope = {
  data: unknown
  // Absolute epoch-ms expiry, or null for no expiry.
  expiresAt: number | null
}

/**
 * A small key/value cache backed by AsyncStorage. Replaces the unmaintained
 * `react-native-storage` wrapper; the public API (load/store/remove/removeAll/
 * clear) is preserved, including the optional `expires` duration on `store`.
 */
export class Cache {
  private static instance?: Cache

  private itemKey(key: string, id: string): string {
    return `${CACHE_PREFIX}:${key}:${id}`
  }

  async load(key: string, id: string): Promise<unknown> {
    try {
      const raw = await AsyncStorage.getItem(this.itemKey(key, id))
      if (raw === null) return {}

      const { data, expiresAt } = JSON.parse(raw) as CacheEnvelope
      if (expiresAt !== null && expiresAt <= Date.now()) {
        await AsyncStorage.removeItem(this.itemKey(key, id))
        return {}
      }

      return data || {}
    } catch {
      return {}
    }
  }

  async store(
    key: string,
    id: string,
    data: unknown,
    // Duration in milliseconds until the entry expires, or null for no expiry.
    expires: number | null = null
  ): Promise<void> {
    const envelope: CacheEnvelope = {
      data,
      expiresAt: expires !== null ? Date.now() + expires : null
    }
    await AsyncStorage.setItem(this.itemKey(key, id), JSON.stringify(envelope))
  }

  async remove(key: string, id: string): Promise<void> {
    await AsyncStorage.removeItem(this.itemKey(key, id))
  }

  async removeAll(key: string): Promise<void> {
    await this.removeByPrefix(`${CACHE_PREFIX}:${key}:`)
  }

  async clear(): Promise<void> {
    await this.removeByPrefix(`${CACHE_PREFIX}:`)
  }

  private async removeByPrefix(prefix: string): Promise<void> {
    const keys = await AsyncStorage.getAllKeys()
    const matching = keys.filter((k) => k.startsWith(prefix))
    if (matching.length > 0) {
      await AsyncStorage.multiRemove(matching)
    }
  }

  static getInstance(): Cache {
    if (this.instance === undefined) {
      this.instance = new Cache()
    }
    return this.instance
  }
}
