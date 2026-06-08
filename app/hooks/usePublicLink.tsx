import React, { useEffect, useRef, useState } from 'react'
import {
  InteractionManager,
  Linking,
  Platform,
  TextInput as RNTextInput
} from 'react-native'
import { Button, Text } from 'react-native-elements'
import Clipboard from '@react-native-clipboard/clipboard'
import Share from 'react-native-share'

import { CredentialRecordRaw } from '../model'
import { PublicLinkScreenMode } from '../screens/PublicLinkScreen/PublicLinkScreen.types'
import {
  createPublicLinkFor,
  getPublicViewLink,
  linkedinUrlFrom,
  unshareCredential
} from '../lib/publicLink'
import { convertSVGtoPDF } from '../lib/svgToPdf'
import { PDF } from '../types/pdf'
import { clearGlobalModal } from '../lib/globalModal'
import {
  nextFrame,
  presentModalSafely,
  safelyBeforeNativePresent,
  tearDownModalIOS,
  wait
} from '../lib/nativePresentation'
import {
  CONFIRM_CREATE_BODY,
  exportPdfBody,
  FaqAnchor,
  linkedinBody,
  UNSHARE_BODY
} from '../lib/publicLinkMessaging'
import { navigationRef } from '../navigation/navigationRef'
import { LinkConfig } from '../../app.config'
import { useDynamicStyles } from './useDynamicStyles'
import { useShareCredentials } from './useShareCredentials'

const faqUrl = (anchor: string) => `${LinkConfig.appWebsite.faq}#${anchor}`

type Selection = { start: number; end: number } | undefined

export type UsePublicLink = {
  publicLink: string | null
  justCreated: boolean
  renderMethodAvailable: boolean
  // Copy-able link field wiring
  inputRef: React.RefObject<RNTextInput | null>
  selection: Selection
  selectionColor: string | undefined
  disableOutsidePressHandler: boolean
  onFocusInput: () => void
  blurInput: () => void
  onSelectionChange: (selection: { start: number; end: number }) => void
  copyToClipboard: () => void
  // QR wiring
  qrCodeRef: React.MutableRefObject<{
    toDataURL: (cb: (data: string) => void) => void
  } | null>
  onQRCodeLayout: () => void
  // Actions
  confirmCreatePublicLink: () => Promise<void>
  unshareLink: () => Promise<void>
  openLink: () => Promise<void>
  exportToPdf: () => Promise<void>
  shareToLinkedIn: () => Promise<void>
  onSendCredential: () => Promise<void>
}

/**
 * Owns the Public Link lifecycle (load/create/unshare), the QR-capture and
 * PDF-export pipeline, and the modal-driven action handlers for
 * `PublicLinkScreen`. Modeled on `useShareCredentials`, which likewise builds
 * modal JSX and orchestrates native-sheet presentation.
 */
export function usePublicLink({
  rawCredentialRecord,
  screenMode,
  navigation
}: {
  rawCredentialRecord: CredentialRecordRaw
  screenMode: PublicLinkScreenMode
  navigation: { popToTop: () => void }
}): UsePublicLink {
  const { mixins, theme } = useDynamicStyles()
  const share = useShareCredentials()

  const { credential } = rawCredentialRecord

  const [publicLink, setPublicLink] = useState<string | null>(null)
  const [renderMethodAvailable, setRenderMethodAvailable] = useState(false)
  const [justCreated, setJustCreated] = useState(false)
  const [pdf, setPdf] = useState<PDF | null>(null)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null)
  const [openedExportPdfModal, setOpenedExportPdfModal] = useState(false)

  const qrCodeRef = useRef<{
    toDataURL: (cb: (data: string) => void) => void
  } | null>(null)

  // ---- Selection (no setNativeProps) ----
  const inputRef = useRef<RNTextInput | null>(null)
  const [selection, setSelection] = useState<Selection>(undefined)
  const disableOutsidePressHandler = inputRef.current?.isFocused() ?? false
  const selectionColor = Platform.select({
    ios: theme.color.brightAccent,
    android: theme.color.highlightAndroid
  })

  // ---- QR capture timing ----
  const [qrReady, setQrReady] = useState(false)
  const onQRCodeLayout = () => setQrReady(true)

  // Gate all QR/PDF side-effects; do NOT run for "Send Credential" JSON flow
  const [allowQrWork, setAllowQrWork] = useState(false)

  // Prevent double-presenting native sheets
  const [presentingNative, setPresentingNative] = useState(false)

  // ---------- Error modal ----------
  async function presentErrorModal(
    title: string,
    message: string,
    detail?: string
  ) {
    await presentModalSafely({
      title,
      cancelOnBackgroundPress: true,
      cancelButton: false,
      confirmText: 'Close',
      body: (
        <>
          <Text style={mixins.modalBodyText}>{message}</Text>
          <Button
            buttonStyle={mixins.buttonClear}
            titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
            containerStyle={mixins.buttonClearContainer}
            title="Details"
            onPress={async () => {
              clearGlobalModal()
              await tearDownModalIOS()
              navigationRef.navigate('ViewSourceScreen', {
                screenTitle: title,
                data: detail ?? ''
              })
            }}
          />
        </>
      )
    })
  }

  // "What does this mean?" link button shared by the confirmation modals
  const faqLinkButton = (anchor: string) => (
    <Button
      buttonStyle={mixins.buttonClear}
      titleStyle={[mixins.buttonClearTitle, mixins.modalLinkText]}
      containerStyle={mixins.buttonClearContainer}
      title="What does this mean?"
      onPress={async () => {
        await safelyBeforeNativePresent()
        await Linking.openURL(faqUrl(anchor))
      }}
    />
  )

  // Render-method availability
  useEffect(() => {
    setRenderMethodAvailable('renderMethod' in credential)
  }, [credential])

  // On mount, defensively clear any stale global modal from previous screens
  useEffect(() => {
    clearGlobalModal()
  }, [])

  // If a link appears (created now or loaded), ensure any loading modal is closed
  useEffect(() => {
    if (publicLink) {
      clearGlobalModal()
      void tearDownModalIOS()
    }
  }, [publicLink])

  // Extra safety: if we just created a link, also ensure any modal is closed
  useEffect(() => {
    if (justCreated) {
      clearGlobalModal()
      void tearDownModalIOS()
    }
  }, [justCreated])

  // Load/create share URL on mount
  useEffect(() => {
    ;(async () => {
      const url = await getPublicViewLink(rawCredentialRecord)
      if (url === null && screenMode === PublicLinkScreenMode.Default) {
        if (Platform.OS === 'ios') await wait(300)
        await createPublicLink() // auto path can still use standard loading modal
      } else if (url !== null) {
        setPublicLink(url)
      }
    })()
  }, [rawCredentialRecord, screenMode])

  // Capture QR only when allowed (PDF flow), link exists, and view is laid out
  useEffect(() => {
    if (!allowQrWork || !publicLink || !qrReady || qrCodeBase64) return
    ;(async () => {
      await InteractionManager.runAfterInteractions()
      await nextFrame()
      qrCodeRef.current?.toDataURL((data: string) => {
        setQrCodeBase64(data)
      })
    })()
  }, [allowQrWork, publicLink, qrReady, qrCodeBase64])

  // Generate PDF once we have both link & captured QR (PDF flow only)
  useEffect(() => {
    if (!allowQrWork || !publicLink || !qrCodeBase64) return
    ;(async () => {
      try {
        const rawPdf = await convertSVGtoPDF(
          credential,
          publicLink,
          qrCodeBase64
        )
        setPdf(rawPdf)
      } catch (e) {
        console.log('ERROR GENERATING PDF:', e)
        await presentErrorModal(
          'Unable to Export PDF',
          'An error occurred while generating the PDF.',
          String(e)
        )
      }
    })()
  }, [allowQrWork, credential, publicLink, qrCodeBase64])

  // Auto open share sheet for PDF once ready
  useEffect(() => {
    if (pdf && pdf.uri && openedExportPdfModal) {
      ;(async () => {
        if (presentingNative) return
        setPresentingNative(true)
        try {
          await safelyBeforeNativePresent()
          await Share.open({ url: pdf.uri })
        } catch (err) {
          console.error('Share failed:', err)
        } finally {
          setOpenedExportPdfModal(false)
          setPresentingNative(false)
        }
      })()
    }
  }, [pdf, openedExportPdfModal, presentingNative])

  // Used by auto-create and "create if needed" flows (PDF/LinkedIn)
  async function createPublicLink() {
    try {
      const createdLink = await createPublicLinkFor(rawCredentialRecord)
      setPublicLink(createdLink)
      setJustCreated(true)
    } catch (err) {
      await presentErrorModal(
        'Unable to Create Public Link',
        'An error occurred while creating the Public Link for this credential.',
        String(err)
      )
    }
  }

  // BUTTON: Create Public Link (single-modal swap to avoid flash)
  async function confirmCreatePublicLink() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Create Link',
      onRequestClose: undefined,
      body: (
        <>
          <Text style={mixins.modalBodyText}>{CONFIRM_CREATE_BODY}</Text>
          {faqLinkButton(FaqAnchor.publicLink)}
        </>
      )
    })

    if (!confirmed) {
      clearGlobalModal()
      return
    }

    clearGlobalModal()
    await tearDownModalIOS()
    await createPublicLink()
  }

  async function unshareLink() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Unshare Link',
      body: (
        <>
          <Text style={mixins.modalBodyText}>{UNSHARE_BODY}</Text>
          {faqLinkButton(FaqAnchor.publicLinkUnshare)}
        </>
      )
    })

    if (!confirmed) return

    clearGlobalModal()
    await tearDownModalIOS()

    try {
      await unshareCredential(rawCredentialRecord)
    } catch (err) {
      console.log('Error unsharing credential:', err)
    }

    setPublicLink(null)
    setJustCreated(false)

    if (screenMode === PublicLinkScreenMode.Default) {
      navigation.popToTop()
    }
  }

  async function openLink() {
    if (!publicLink || presentingNative) return
    try {
      setPresentingNative(true)
      await safelyBeforeNativePresent()
      await Linking.canOpenURL(publicLink)
      await Linking.openURL(publicLink)
    } finally {
      setPresentingNative(false)
    }
  }

  function copyToClipboard() {
    if (publicLink) Clipboard.setString(publicLink)
  }

  async function exportToPdf() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Export as PDF',
      cancelOnBackgroundPress: true,
      body: (
        <>
          <Text style={mixins.modalBodyText}>
            {exportPdfBody(!!publicLink)}
          </Text>
          {faqLinkButton(FaqAnchor.exportToPdf)}
        </>
      )
    })

    if (!confirmed) {
      clearGlobalModal()
      return
    }

    clearGlobalModal()
    await tearDownModalIOS()

    setAllowQrWork(true)
    setOpenedExportPdfModal(true)

    if (!publicLink) {
      await createPublicLink()
    }
  }

  async function shareToLinkedIn() {
    const confirmed = await presentModalSafely({
      title: 'Are you sure?',
      confirmText: 'Add to LinkedIn',
      cancelOnBackgroundPress: true,
      body: (
        <>
          <Text style={mixins.modalBodyText}>{linkedinBody(!!publicLink)}</Text>
          {faqLinkButton(FaqAnchor.addToLinkedin)}
        </>
      )
    })

    if (!confirmed) {
      clearGlobalModal()
      return
    }

    await safelyBeforeNativePresent()

    if (!publicLink) {
      await createPublicLink()
    }

    if (presentingNative) return
    setPresentingNative(true)
    try {
      const url = await linkedinUrlFrom(rawCredentialRecord)
      await Linking.canOpenURL(url)
      await Linking.openURL(url)
    } finally {
      setPresentingNative(false)
    }
  }

  // Send credential as JSON
  async function onSendCredential() {
    if (presentingNative) return
    setPresentingNative(true)
    try {
      await safelyBeforeNativePresent()
      await share([rawCredentialRecord])
    } catch (e) {
      console.log('Share JSON failed:', e)
    } finally {
      setPresentingNative(false)
    }
  }

  function onFocusInput() {
    const len = publicLink?.length ?? 0
    setSelection({ start: 0, end: len })
  }

  function blurInput() {
    inputRef.current?.blur()
  }

  return {
    publicLink,
    justCreated,
    renderMethodAvailable,
    inputRef,
    selection,
    selectionColor,
    disableOutsidePressHandler,
    onFocusInput,
    blurInput,
    onSelectionChange: setSelection,
    copyToClipboard,
    qrCodeRef,
    onQRCodeLayout,
    confirmCreatePublicLink,
    unshareLink,
    openLink,
    exportToPdf,
    shareToLinkedIn,
    onSendCredential
  }
}
