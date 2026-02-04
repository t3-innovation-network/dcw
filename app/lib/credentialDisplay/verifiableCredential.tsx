import moment from 'moment'
import React, { useContext } from 'react'
import { View, Text, ImageSourcePropType } from 'react-native'
import { Button } from 'react-native-elements'
import { mixins } from '../../styles'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.d'
import CredentialStatusBadges from '../../components/CredentialStatusBadges/CredentialStatusBadges'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import { getIssuanceDate } from '../credentialValidityPeriod'
import type { CredentialCardProps, CredentialDisplayConfig } from '.'
import defaultIssuerImage from '../../assets/defaultIssuer.png'
import { DidRegistryContext } from '../../init/registries'
import { shouldDisableUrls } from '../credentialSecurity'
import {
  CardLink,
  CardDetail,
  dynamicStyleSheet,
  CardImage,
  issuerRenderInfoWithVerification,
  credentialSubjectRenderInfoFrom,
  IssuerInfoButton,
  getSubject
} from './shared'

import { DATE_FORMAT } from '../../../app.config'
import { getCredentialName } from '../credentialName'
const getSafeImageSource = (imageUri?: string | null): ImageSourcePropType => {
  return imageUri && imageUri.trim() !== ''
    ? { uri: imageUri }
    : defaultIssuerImage
}

type NavigationProp = StackNavigationProp<CredentialNavigationParamList>

function VerifiableCredentialCard({
  rawCredentialRecord
}: CredentialCardProps): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet)
  const { credential } = rawCredentialRecord
  const verifyCredential = useVerifyCredential(rawCredentialRecord)
  const registries = useContext(DidRegistryContext)
  const urlsDisabled = shouldDisableUrls(credential, registries)
  const navigation = useNavigation<NavigationProp>()
  const subject = getSubject(credential) as any
  const { issuer } = credential

  const issuanceDate = getIssuanceDate(credential)
  const formattedIssuanceDate = issuanceDate
    ? moment(issuanceDate).format(DATE_FORMAT)
    : 'N/A'
  const title = getCredentialName(credential)
  const {
    description,
    criteria,
    subjectName,
    numberOfCredits,
    startDateFmt,
    endDateFmt
  } = credentialSubjectRenderInfoFrom(subject)

  const evidenceLink = String(subject?.evidenceLink ?? '').trim()
  const portfolioEvidence = (() => {
    const raw = subject?.portfolio
    const items = Array.isArray(raw) ? raw : raw ? [raw] : []

    return items
      .map((item: unknown) => {
        if (typeof item === 'string') {
          const url = item.trim()
          if (!url) return null
          return { name: url, url }
        }
        if (!item || typeof item !== 'object') return null

        const url = String((item as any).url ?? (item as any).id ?? '').trim()
        if (!url) return null

        const name = String((item as any).name ?? '').trim()
        return { name: name || url, url }
      })
      .filter(Boolean) as Array<{ name: string; url: string }>
  })()

  const { issuerName, issuerUrl, issuerId, issuerImage } =
    issuerRenderInfoWithVerification(issuer, verifyCredential?.result)

  return (
    <View style={styles.cardContainer}>
      <View style={styles.dataContainer}>
        <CredentialStatusBadges
          rawCredentialRecord={rawCredentialRecord}
          badgeBackgroundColor={theme.color.backgroundPrimary}
        />
        {urlsDisabled && (
          <Text style={styles.warningText}>
            ⚠️ Links disabled - unrecognized issuer
          </Text>
        )}
        <Text style={styles.header} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.dataLabel}>Issuer</Text>
        <View style={styles.flexRow}>
          <CardImage
            source={getSafeImageSource(issuerImage)}
            accessibilityLabel={issuerName}
          />
          <View style={styles.spaceBetween}>
            <IssuerInfoButton
              issuerId={issuerId}
              issuerName={issuerName}
              onPress={() => {
                if (issuerId && rawCredentialRecord) {
                  navigation.navigate('IssuerInfoScreen', {
                    issuerId,
                    rawCredentialRecord
                  })
                } else {
                  console.warn('Missing issuerId or rawCredentialRecord')
                }
              }}
            />
            <View style={styles.issuerContent}>
              <CardLink url={issuerUrl} disabled={urlsDisabled} />
            </View>
          </View>
        </View>

        <Button
          title="Issuer Details"
          buttonStyle={mixins.buttonPrimary}
          containerStyle={styles.issuerButton}
          titleStyle={mixins.buttonTitle}
          onPress={() => {
            if (issuerId && rawCredentialRecord) {
              navigation.navigate('IssuerInfoScreen', {
                issuerId,
                rawCredentialRecord
              })
            } else {
              console.warn('Missing issuerId or rawCredentialRecord')
            }
          }}
        />
      </View>
      <CardDetail label="Issuance Date" value={formattedIssuanceDate} />
      <CardDetail label="Issued To" value={subjectName} />
      <CardDetail label="Number of Credits" value={numberOfCredits} />
      <View style={styles.flexRow}>
        <CardDetail label="Start Date" value={startDateFmt} />
        <CardDetail label="End Date" value={endDateFmt} />
      </View>
      <CardDetail label="Description" value={description} />
      <CardDetail label="Criteria" value={criteria} />
      {!!evidenceLink && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Evidence link</Text>
          <CardLink url={evidenceLink} disabled={urlsDisabled} />
        </View>
      )}
      {portfolioEvidence.length > 0 ? (
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Portfolio</Text>
          {portfolioEvidence.map((p, idx) => (
            <View key={`${p.url}-${idx}`} style={{ marginBottom: 8 }}>
              <Text style={styles.dataValue}>{p.name}</Text>
              <CardLink url={p.url} disabled={urlsDisabled} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export const verifiableCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'VerifiableCredential',
  cardComponent: VerifiableCredentialCard,
  itemPropsResolver: (credential) => {
    const subject = getSubject(credential)
    const title = getCredentialName(credential)
    const { achievementImage } = credentialSubjectRenderInfoFrom(subject)
    const { issuerName, issuerImage } = issuerRenderInfoWithVerification(
      credential.issuer
    )

    return {
      title,
      subtitle: issuerName,
      image: achievementImage || issuerImage || defaultIssuerImage
    }
  }
}
