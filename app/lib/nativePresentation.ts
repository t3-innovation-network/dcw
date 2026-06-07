import { InteractionManager, Platform } from 'react-native'
import { clearGlobalModal, displayGlobalModal } from './globalModal'

/**
 * iOS-safe timing helpers for presenting native sheets / modals without the
 * "presenting on itself" race. Extracted from PublicLinkScreen so they can be
 * reused (WasScreen, ResumePreviewScreen) and unit-tested.
 */

export const wait = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Resolve after roughly one frame (~16ms). Avoids a bare rAF global for lint. */
export const nextFrame = (): Promise<void> => wait(16)

/**
 * On iOS, wait for any in-flight modal dismissal/transition to finish before
 * presenting a native sheet. No-op on other platforms.
 */
export async function tearDownModalIOS(): Promise<void> {
  if (Platform.OS !== 'ios') return
  await InteractionManager.runAfterInteractions()
  await wait(160)
  await nextFrame()
}

/** Close any RN global modal, then wait for the iOS dismissal to settle. */
export async function safelyBeforeNativePresent(): Promise<void> {
  clearGlobalModal() // close any RN modal first
  await tearDownModalIOS() // wait for dismissal to finish on iOS
}

/** Ensure no modal is mid-transition, then present the global modal. */
export function presentModalSafely(
  config: Parameters<typeof displayGlobalModal>[0]
): Promise<boolean> {
  return tearDownModalIOS().then(() => displayGlobalModal(config))
}
