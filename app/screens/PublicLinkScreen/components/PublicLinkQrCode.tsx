import React from 'react'
import { View } from 'react-native'
import { Text } from '@rneui/themed'
import QRCode from 'react-native-qrcode-svg'

import { useDynamicStyles } from '../../../hooks'
import dynamicStyleSheet from '../PublicLinkScreen.styles'

export type PublicLinkQrCodeProps = {
  publicLink: string
  onQRCodeLayout: () => void
  qrCodeRef: React.MutableRefObject<{
    toDataURL: (cb: (data: string) => void) => void
  } | null>
}

/** QR-code rendering of the public link (also captured for PDF export). */
export default function PublicLinkQrCode({
  publicLink,
  onQRCodeLayout,
  qrCodeRef
}: PublicLinkQrCodeProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)

  return (
    <View style={styles.bottomSection} onLayout={onQRCodeLayout}>
      <Text style={mixins.paragraphText}>
        You may also share the public link by having another person scan this QR
        code.
      </Text>
      <View style={styles.qrCodeContainer}>
        <View style={styles.qrCode}>
          <QRCode
            value={publicLink}
            size={200}
            getRef={(ref) => (qrCodeRef.current = ref)}
          />
        </View>
      </View>
    </View>
  )
}
