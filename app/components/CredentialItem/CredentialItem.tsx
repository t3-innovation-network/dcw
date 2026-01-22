import React, { ComponentProps, useMemo } from 'react'
import { Image, View, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-elements'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import dynamicStyleSheet from './CredentialItem.styles'
import type { CredentialItemProps } from './CredentialItem.d'
import CredentialStatusBadges from '../CredentialStatusBadges/CredentialStatusBadges'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import { credentialItemPropsFor } from '../../lib/credentialDisplay'
import { CardImage } from '../../lib/credentialDisplay/shared'
import verifiedStatusIcon from '../../assets/deafulatIssueBrightGreen.png'
import notVerifiedStatusIcon from '../../assets/NotVerified.png'

type VerificationStatus = 'verifying' | 'verified' | 'warning' | 'not_verified'

function CredentialItem({
  onSelect,
  checkable = false,
  selected = false,
  selectionVariant = 'checkbox',
  chevron = false,
  hideLeft = false,
  bottomElement,
  rawCredentialRecord,
  credential,
  showStatusBadges = false,
  precomputedVerification,
  precomputedPublic,
  onPressDisabled
}: CredentialItemProps): React.ReactElement {
  const { styles, theme, mixins } = useDynamicStyles(dynamicStyleSheet)
  const verifyCredential = useVerifyCredential(rawCredentialRecord)

  const isRadio = selectionVariant === 'radio'

  const {
    title,
    subtitle,
    image: rawImage
  } = credentialItemPropsFor(credential)

  const image = typeof rawImage === 'string' ? { uri: rawImage } : rawImage

  const hasBottomElement = bottomElement !== undefined
  const accessibilityProps: ComponentProps<typeof View> = {
    accessibilityLabel: `${title} Credential, from ${subtitle}`,
    // For single-select mode, use a radio role instead of checkbox
    accessibilityRole: checkable ? (isRadio ? 'radio' : 'checkbox') : 'button',
    accessibilityState: { checked: checkable ? selected : undefined }
  }

  const verificationStatus = useMemo<VerificationStatus>(() => {
    const logs = verifyCredential?.result?.log ?? []
    const isLoading = verifyCredential?.loading
    const isVerified = verifyCredential?.result?.verified

    if (logs.length === 0 && isVerified === null) return 'not_verified'
    if (isLoading && logs.length > 0) return 'verifying'

    const details = logs.reduce<Record<string, boolean>>((acc, log) => {
      acc[log.id] = log.valid
      return acc
    }, {})

    ;['valid_signature', 'expiration', 'registered_issuer'].forEach((key) => {
      if (!(key in details)) {
        details[key] = false
      }
    })

    const hasFailure = ['valid_signature', 'revocation_status'].some(
      (key) => details[key] === false
    )

    const hasWarning = ['expiration', 'registered_issuer'].some(
      (key) => details[key] === false
    )

    if (hasFailure) return 'not_verified'
    if (hasWarning) return 'warning'

    return 'verified'
  }, [verifyCredential])

  function LeftContent(): React.ReactElement | null {
    if (hideLeft) return null

    if (checkable) {
      return (
        <TouchableOpacity
          onPress={onSelect}
          activeOpacity={1}
          style={styles.checkboxContainer}
          accessibilityRole={isRadio ? 'radio' : 'checkbox'}
          accessibilityState={{ checked: selected }}
        >
          <View
            style={[
              isRadio ? styles.radioOuter : styles.checkboxBox,
              selected &&
                (isRadio
                  ? styles.radioOuterSelected
                  : styles.checkboxBoxSelected)
            ]}
          >
            {selected &&
              (isRadio ? (
                <View style={styles.radioInner} />
              ) : (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={theme.color.backgroundPrimary}
                />
              ))}
          </View>
        </TouchableOpacity>
      )
    }

    const hasImage = image?.uri?.startsWith('http')

    if (hasImage) {
      return (
        <CardImage
          source={image?.uri || null}
          accessibilityLabel={subtitle}
          size={theme.issuerIconSize - 8}
        />
      )
    }

    if (verificationStatus === 'not_verified') {
      return (
        <View style={styles.notVerifiedIcon}>
          <Image
            source={notVerifiedStatusIcon}
            style={styles.verifiedStatusIcon}
          />
        </View>
      )
    }

    if (verificationStatus === 'warning') {
      return (
        <View style={styles.notVerifiedIcon}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={theme.issuerIconSize - 8}
            color={theme.color.warning}
          />
        </View>
      )
    }

    if (verificationStatus === 'verifying') {
      return (
        <View style={styles.notVerifiedIcon}>
          <MaterialCommunityIcons
            // Static spinner glyph (no animation)
            name="loading"
            size={theme.issuerIconSize - 8}
            color={theme.color.textSecondary}
          />
        </View>
      )
    }

    if (verificationStatus === 'verified') {
      return (
        <View style={styles.notVerifiedIcon}>
          <Image
            source={verifiedStatusIcon}
            style={styles.verifiedStatusIcon}
          />
        </View>
      )
    }

    // Fallback: treat unknown state as verified icon
    return (
      <View style={styles.notVerifiedIcon}>
        <Image source={verifiedStatusIcon} style={styles.verifiedStatusIcon} />
      </View>
    )
  }

  function StatusBadges(): React.ReactElement | null {
    if (!showStatusBadges || !rawCredentialRecord) return null

    return (
      <CredentialStatusBadges
        rawCredentialRecord={rawCredentialRecord}
        badgeBackgroundColor={theme.color.backgroundPrimary}
        precomputedVerification={precomputedVerification as any}
        precomputedPublic={precomputedPublic}
      />
    )
  }

  function Chevron(): React.ReactElement | null {
    if (!chevron) return null
    return (
      <MaterialCommunityIcons
        name="chevron-right"
        size={theme.issuerIconSize - 8}
        color={theme.color.textSecondary}
      />
    )
  }

  return (
    <View style={styles.listItemOuterContainer}>
      <TouchableOpacity
        style={styles.listItemContainer}
        onPress={onPressDisabled ? undefined : onSelect}
        activeOpacity={1}
        accessible={!hasBottomElement}
        importantForAccessibility={hasBottomElement ? 'no' : 'yes'}
        testID="credential-card-item"
        {...accessibilityProps}
      >
        <View style={styles.listItemContentContainer}>
          <View
            style={styles.listItemTopContent}
            accessible={hasBottomElement}
            importantForAccessibility={
              hasBottomElement ? 'yes' : 'no-hide-descendants'
            }
            {...accessibilityProps}
          >
            <LeftContent />
            <View style={styles.listItemTextContainer}>
              <StatusBadges />
              <Text style={styles.listItemTitle}>{title}</Text>
              <Text style={styles.listItemSubtitle}>{subtitle}</Text>
            </View>
            <Chevron />
          </View>
          {bottomElement}
        </View>
      </TouchableOpacity>
    </View>
  )
}

export default React.memo(CredentialItem)
