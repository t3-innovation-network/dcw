import moment from 'moment'
import React from 'react'
import { View, Text } from 'react-native'
import { Button } from '@rneui/themed'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import type { ICredentialSubject } from '@interop/data-integrity-core'
import type { CredentialCardProps, CredentialDisplayConfig } from '.'
import { mixins } from '../../styles'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import { DATE_FORMAT } from '../../../app.config'
import { getExpirationDate, getIssuanceDate } from '../credentialValidityPeriod'
import { getCredentialName } from '../credentialName'
import defaultIssuerImage from '../../assets/defaultIssuer.png'
import { shouldDisableUrls } from '../credentialSecurity'
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.types'
import {
  CardLink,
  CardDetail,
  dynamicStyleSheet,
  CardImage,
  issuerRenderInfoWithVerification,
  IssuerInfoButton,
  getSubject
} from './shared'
import { evidenceFromCredential } from './shared/utils/evidence'
import { stripHtml } from '../stripHtml'
import { getSafeImageSource } from '../getsafeImagesource'

type NavigationProp = StackNavigationProp<CredentialNavigationParamList>

function RecommendationCredentialCard({
  rawCredentialRecord
}: CredentialCardProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { credential } = rawCredentialRecord
  const verifyCredential = useVerifyCredential(rawCredentialRecord)
  const urlsDisabled = shouldDisableUrls(verifyCredential?.result)
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

  const subjectName = subject?.name as string
  const howKnow = subject?.howKnow as string
  const recommendationText = stripHtml(subject?.recommendationText as string)
  const qualifications = stripHtml(subject?.qualifications as string)
  const explainAnswer = stripHtml(subject?.explainAnswer as string)

  const portfolioEvidence = evidenceFromCredential(credential, subject)

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

      {subjectName && (
        <CardDetail label="Recommended Person" value={subjectName} />
      )}
      {howKnow && <CardDetail label="How do you know them?" value={howKnow} />}
      {recommendationText && (
        <CardDetail
          label="Recommendation"
          value={recommendationText}
          isMarkdown={true}
        />
      )}
      {qualifications && (
        <CardDetail label="Qualifications" value={qualifications} />
      )}
      {explainAnswer && (
        <CardDetail label="Explain Answer" value={explainAnswer} />
      )}

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
