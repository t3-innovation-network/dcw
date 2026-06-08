import { Cache, CacheKey } from '../app/lib/cache'
import AsyncStorage from '@react-native-async-storage/async-storage'

// In-memory AsyncStorage so the cache is exercised end-to-end (round trips,
// expiry, prefix-scoped clearing) rather than asserting calls to a library.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v
      return Promise.resolve()
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k]
      return Promise.resolve()
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((k) => delete store[k])
      return Promise.resolve()
    }),
    __reset: () => {
      store = {}
    }
  }
})

describe('Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(AsyncStorage as unknown as { __reset: () => void }).__reset()
    // Reset singleton instance
    ;(Cache as unknown as { instance?: Cache }).instance = undefined
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      expect(Cache.getInstance()).toBe(Cache.getInstance())
    })
  })

  describe('store / load', () => {
    it('round-trips stored data', async () => {
      const cache = Cache.getInstance()
      await cache.store('testKey', 'testId', { test: 'data' })

      expect(await cache.load('testKey', 'testId')).toEqual({ test: 'data' })
    })

    it('namespaces entries by key and id under the cache prefix', async () => {
      const cache = Cache.getInstance()
      await cache.store('testKey', 'testId', { test: 'data' })

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@dcw-cache:testKey:testId',
        expect.any(String)
      )
    })

    it('returns an empty object for a missing entry', async () => {
      expect(await Cache.getInstance().load('testKey', 'missing')).toEqual({})
    })

    it('returns an empty object when the stored value is corrupt', async () => {
      await AsyncStorage.setItem('@dcw-cache:testKey:bad', 'not json')

      expect(await Cache.getInstance().load('testKey', 'bad')).toEqual({})
    })
  })

  describe('expiry', () => {
    it('returns expired entries as empty and evicts them', async () => {
      const cache = Cache.getInstance()
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1000)

      // Expires 5s after the (mocked) store time.
      await cache.store('testKey', 'testId', { test: 'data' }, 5000)

      nowSpy.mockReturnValue(1000 + 6000) // advance past expiry
      expect(await cache.load('testKey', 'testId')).toEqual({})
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@dcw-cache:testKey:testId'
      )

      nowSpy.mockRestore()
    })

    it('keeps entries with a null expiry', async () => {
      const cache = Cache.getInstance()
      await cache.store('testKey', 'testId', { test: 'data' }, null)

      expect(await cache.load('testKey', 'testId')).toEqual({ test: 'data' })
    })
  })

  describe('remove', () => {
    it('removes a single entry', async () => {
      const cache = Cache.getInstance()
      await cache.store('testKey', 'testId', { test: 'data' })

      await cache.remove('testKey', 'testId')

      expect(await cache.load('testKey', 'testId')).toEqual({})
    })
  })

  describe('removeAll', () => {
    it('removes every entry under a key but leaves other keys intact', async () => {
      const cache = Cache.getInstance()
      await cache.store('testKey', 'a', { n: 1 })
      await cache.store('testKey', 'b', { n: 2 })
      await cache.store('otherKey', 'c', { n: 3 })

      await cache.removeAll('testKey')

      expect(await cache.load('testKey', 'a')).toEqual({})
      expect(await cache.load('testKey', 'b')).toEqual({})
      expect(await cache.load('otherKey', 'c')).toEqual({ n: 3 })
    })
  })

  describe('clear', () => {
    it('removes all cache entries but not unrelated AsyncStorage keys', async () => {
      const cache = Cache.getInstance()
      await cache.store('testKey', 'a', { n: 1 })
      await cache.store('otherKey', 'b', { n: 2 })
      // A non-cache key the app keeps elsewhere in AsyncStorage.
      await AsyncStorage.setItem('themeName', 'dark')

      await cache.clear()

      expect(await cache.load('testKey', 'a')).toEqual({})
      expect(await cache.load('otherKey', 'b')).toEqual({})
      expect(await AsyncStorage.getItem('themeName')).toBe('dark')
    })
  })

  describe('CacheKey enum', () => {
    it('should have expected cache keys', () => {
      expect(CacheKey.PublicLinks).toBe('publiclinks')
    })
  })
})
