import { InteractionManager, Platform } from 'react-native'
import {
  presentModalSafely,
  safelyBeforeNativePresent,
  tearDownModalIOS
} from '../app/lib/nativePresentation'
import { clearGlobalModal, displayGlobalModal } from '../app/lib/globalModal'

jest.mock('../app/lib/globalModal', () => ({
  clearGlobalModal: jest.fn(),
  displayGlobalModal: jest.fn()
}))

const originalOS = Platform.OS

describe('nativePresentation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    Platform.OS = originalOS
  })

  describe('tearDownModalIOS', () => {
    it('is a no-op off iOS', async () => {
      Platform.OS = 'android'
      const spy = jest.spyOn(InteractionManager, 'runAfterInteractions')

      await tearDownModalIOS()

      expect(spy).not.toHaveBeenCalled()
    })

    it('waits for interactions on iOS', async () => {
      Platform.OS = 'ios'
      const spy = jest
        .spyOn(InteractionManager, 'runAfterInteractions')
        .mockReturnValue({ then: (cb: () => void) => cb() } as never)

      await tearDownModalIOS()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('safelyBeforeNativePresent', () => {
    it('clears the global modal first', async () => {
      Platform.OS = 'android'

      await safelyBeforeNativePresent()

      expect(clearGlobalModal).toHaveBeenCalledTimes(1)
    })
  })

  describe('presentModalSafely', () => {
    it('forwards the config to displayGlobalModal and returns its result', async () => {
      Platform.OS = 'android'
      ;(displayGlobalModal as jest.Mock).mockResolvedValue(true)
      const config = { title: 'Hi' } as Parameters<typeof presentModalSafely>[0]

      const result = await presentModalSafely(config)

      expect(displayGlobalModal).toHaveBeenCalledWith(config)
      expect(result).toBe(true)
    })
  })
})
