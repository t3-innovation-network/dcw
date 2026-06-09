import React from 'react'
import { View, ScrollView } from 'react-native'
import { Button, Text } from '@rneui/themed'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'

import {
  PublicLinkScreenMode,
  PublicLinkScreenParams
} from './PublicLinkScreen.types'
import dynamicStyleSheet from './PublicLinkScreen.styles'
import NavHeader from '../../components/NavHeader/NavHeader'
import PublicLinkField from './components/PublicLinkField'
import PublicLinkActions from './components/PublicLinkActions'
import PublicLinkQrCode from './components/PublicLinkQrCode'
import { useDynamicStyles, usePublicLink } from '../../hooks'
import {
  publicLinkInstructions,
  publicLinkScreenTitle
} from '../../lib/publicLinkMessaging'

// Re-exported for callers that historically imported the enum from this module.
export { PublicLinkScreenMode } from './PublicLinkScreen.types'

export default function PublicLinkScreen({
  navigation,
  route
}: {
  navigation: any
  route: { params: PublicLinkScreenParams }
}): React.ReactElement {
  const { styles, mixins, theme } = useDynamicStyles(dynamicStyleSheet)

  const { rawCredentialRecord, screenMode = PublicLinkScreenMode.Default } =
    route.params
  const { name } = rawCredentialRecord.credential

  const {
    publicLink,
    justCreated,
    renderMethodAvailable,
    inputRef,
    selection,
    selectionColor,
    disableOutsidePressHandler,
    onFocusInput,
    blurInput,
    onSelectionChange,
    copyToClipboard,
    qrCodeRef,
    onQRCodeLayout,
    confirmCreatePublicLink,
    unshareLink,
    openLink,
    exportToPdf,
    shareToLinkedIn,
    onSendCredential
  } = usePublicLink({ rawCredentialRecord, screenMode, navigation })

  const screenTitle = publicLinkScreenTitle(screenMode)
  const instructionsText = publicLinkInstructions(screenMode, {
    hasLink: !!publicLink,
    justCreated
  })

  return (
    <>
      <NavHeader title={screenTitle} goBack={() => navigation.goBack()} />
      <View style={styles.outerContainer}>
        <ScrollView style={styles.scrollContainer} accessible={false}>
          <View style={styles.container}>
            {screenMode === PublicLinkScreenMode.Default && (
              <Text style={styles.title}>{name || 'Credential'}</Text>
            )}
            <Text style={styles.instructions}>{instructionsText}</Text>

            {publicLink ? (
              <View>
                <PublicLinkField
                  publicLink={publicLink}
                  inputRef={inputRef}
                  selection={selection}
                  selectionColor={selectionColor}
                  disableOutsidePressHandler={disableOutsidePressHandler}
                  onFocusInput={onFocusInput}
                  blurInput={blurInput}
                  onSelectionChange={onSelectionChange}
                  copyToClipboard={copyToClipboard}
                />
                <PublicLinkActions
                  onUnshare={unshareLink}
                  onViewLink={openLink}
                />
              </View>
            ) : (
              <Button
                title="Create Public Link"
                buttonStyle={mixins.buttonIcon}
                containerStyle={mixins.buttonIconContainer}
                titleStyle={mixins.buttonIconTitle}
                iconRight
                onPress={confirmCreatePublicLink}
                testID="create-public-link-button"
                icon={
                  <MaterialIcons
                    name="link"
                    size={theme.iconSize}
                    color={theme.color.textPrimaryDark}
                  />
                }
              />
            )}

            <View style={styles.otherOptionsContainer}>
              {renderMethodAvailable && (
                <Button
                  title="Export To PDF"
                  buttonStyle={mixins.buttonIcon}
                  containerStyle={mixins.buttonIconContainer}
                  titleStyle={mixins.buttonIconTitle}
                  iconRight
                  onPress={exportToPdf}
                  icon={<Ionicons name="document-text" size={theme.iconSize} />}
                />
              )}

              <Button
                title="Add to LinkedIn Profile"
                buttonStyle={mixins.buttonIcon}
                containerStyle={mixins.buttonIconContainer}
                titleStyle={mixins.buttonIconTitle}
                iconRight
                onPress={shareToLinkedIn}
                testID="linkedin-button"
                icon={
                  <Ionicons
                    name="logo-linkedin"
                    size={theme.iconSize}
                    color={theme.color.textPrimaryDark}
                  />
                }
              />

              {screenMode === PublicLinkScreenMode.ShareCredential && (
                <View>
                  <Button
                    title="Send Credential"
                    buttonStyle={mixins.buttonIcon}
                    containerStyle={mixins.buttonIconContainer}
                    titleStyle={mixins.buttonIconTitle}
                    iconRight
                    onPress={onSendCredential}
                    testID="send-credential-button"
                    icon={
                      <MaterialIcons
                        name="send"
                        size={theme.iconSize}
                        color={theme.color.textPrimaryDark}
                      />
                    }
                  />
                  <Text style={styles.paragraph}>
                    Allows sending one or more credentials as a JSON file
                  </Text>
                </View>
              )}

              {publicLink && (
                <PublicLinkQrCode
                  publicLink={publicLink}
                  onQRCodeLayout={onQRCodeLayout}
                  qrCodeRef={qrCodeRef}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  )
}
