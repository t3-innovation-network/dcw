import moment from 'moment'
import React, { useContext } from 'react'
import { View, Text, ImageSourcePropType } from 'react-native'
import { Button } from 'react-native-elements'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import type { ICredentialSubject } from '@digitalcredentials/ssi'
import type { CredentialCardProps, CredentialDisplayConfig } from '.'
import { mixins } from '../../styles'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import { DATE_FORMAT } from '../../../app.config'
import { getExpirationDate, getIssuanceDate } from '../credentialValidityPeriod'
import { getCredentialName } from '../credentialName'
import defaultIssuerImage from '../../assets/defaultIssuer.png'
import { DidRegistryContext } from '../../init/registries'
import { shouldDisableUrls } from '../credentialSecurity'
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.d'
import {
  CardLink,
  CardDetail,
  dynamicStyleSheet,
  CardImage,
  issuerRenderInfoWithVerification,
  IssuerInfoButton,
  getSubject
} from './shared'
import { portfolioEvidenceFrom } from './shared/utils/evidence'

type NavigationProp = StackNavigationProp<CredentialNavigationParamList>

const getSafeImageSource = (imageUri?: string | null): ImageSourcePropType => {
  return imageUri && imageUri.trim() !== ''
    ? { uri: imageUri }
    : defaultIssuerImage
}

function safeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v.length > 0 ? v : null
}

function RecommendationCredentialCard({
  rawCredentialRecord
}: CredentialCardProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { credential } = rawCredentialRecord
  const verifyCredential = useVerifyCredential(rawCredentialRecord)
  const registries = useContext(DidRegistryContext)
  const urlsDisabled = shouldDisableUrls(
    credential,
    registries,
    verifyCredential?.result
  )
  const navigation = useNavigation<NavigationProp>()

  const subject = getSubject(credential) as ICredentialSubject & {
    howKnow?: unknown
    recommendationText?: unknown
    qualifications?: unknown
    explainAnswer?: unknown
    portfolio?: unknown
  }

  const issuanceDate = getIssuanceDate(credential)
  const expirationDate = getExpirationDate(credential)
  const formattedIssuanceDate = issuanceDate
    ? moment(issuanceDate).format(DATE_FORMAT)
    : 'N/A'
  const formattedExpirationDate = expirationDate
    ? moment(expirationDate).format(DATE_FORMAT)
    : 'N/A'

  const title = getCredentialName(credential)

  const { issuerName, issuerUrl, issuerId, issuerImage } =
    issuerRenderInfoWithVerification(
      credential.issuer,
      verifyCredential?.result
    )

  const subjectName = safeText((subject as any)?.name)
  const howKnow = safeText(subject?.howKnow)
  const recommendationText = safeText(subject?.recommendationText)
  const qualifications = safeText(subject?.qualifications)
  const explainAnswer = safeText(subject?.explainAnswer)

  const portfolioEvidence = portfolioEvidenceFrom(subject?.portfolio)

  return (
    <View style={styles.cardContainer}>
      <View style={styles.dataContainer}>
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

      <View style={styles.dateStyles}>
        <CardDetail label="Issuance Date" value={formattedIssuanceDate} />
        <CardDetail label="Expiration Date" value={formattedExpirationDate} />
      </View>

      <CardDetail label="Recommended Person" value={subjectName} />
      <CardDetail label="How do you know them?" value={howKnow} />
      <CardDetail
        label="Recommendation"
        value={recommendationText}
        isMarkdown={true}
      />
      <CardDetail label="Qualifications" value={qualifications} />
      <CardDetail label="Explain Answer" value={explainAnswer} />

      {portfolioEvidence.length > 0 ? (
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Evidence</Text>
          {portfolioEvidence.map((p, idx) => (
            <View key={`${p.url}-${idx}`} style={{ marginBottom: 8 }}>
              <CardLink url={p.url} label={p.name} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export const recommendationCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'https://schema.org/RecommendationCredential',
  cardComponent: RecommendationCredentialCard,
  itemPropsResolver: (credential) => {
    const title = getCredentialName(credential)
    const { issuerName, issuerImage } = issuerRenderInfoWithVerification(
      credential.issuer
    )

    return {
      title,
      subtitle: issuerName,
      image: issuerImage || defaultIssuerImage
    }
  }
}
