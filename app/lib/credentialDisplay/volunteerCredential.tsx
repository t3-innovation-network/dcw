import React from 'react'
import { View, Text } from 'react-native'
import { Button } from 'react-native-elements'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import type { CredentialCardProps, CredentialDisplayConfig } from '.'
import { mixins } from '../../styles'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import { DATE_FORMAT } from '../../../app.config'
import defaultIssuerImage from '../../assets/defaultIssuer.png'
import { shouldDisableUrls } from '../credentialSecurity'
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.types'
import type { VolunteerCredentialSubject } from '../../types/credential'
import { getCredentialName } from '../credentialName'
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
import { asNonEmptyString, formatMaybeDate } from './shared/utils/presentation'
import { getSafeImageSource } from '../getsafeImagesource'

type NavigationProp = StackNavigationProp<CredentialNavigationParamList>

function volunteerSkillsValue(rawSkills: unknown): string | null {
  const values = Array.isArray(rawSkills) ? rawSkills : [rawSkills]
  const clean = values
    .map((value) => asNonEmptyString(value))
    .filter(Boolean) as string[]
  if (!clean.length) return null
  return clean.join(', ')
}

function VolunteerCredentialCard({
  rawCredentialRecord
}: CredentialCardProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { credential } = rawCredentialRecord
  const verifyCredential = useVerifyCredential(rawCredentialRecord)
  const urlsDisabled = shouldDisableUrls(verifyCredential?.result)
  const navigation = useNavigation<NavigationProp>()
  const subject = getSubject(credential) as VolunteerCredentialSubject

  const title = getCredentialName(credential)
  const issuanceDate = formatMaybeDate(credential?.issuanceDate, DATE_FORMAT)
  const fullName = asNonEmptyString(subject?.fullName)
  const volunteerWork = asNonEmptyString(subject?.volunteerWork)
  const volunteerOrg = asNonEmptyString(subject?.volunteerOrg)
  const volunteerDescription = asNonEmptyString(subject?.volunteerDescription)
  const skillsGained = volunteerSkillsValue(subject?.skillsGained)
  const duration = asNonEmptyString(subject?.duration)
  const volunteerDates = asNonEmptyString(subject?.volunteerDates)
  const evidenceLink = asNonEmptyString(subject?.evidenceLink)
  const evidenceDescription = asNonEmptyString(subject?.evidenceDescription)
  const portfolioEvidence = evidenceFromCredential(credential, subject)

  const { issuerName, issuerUrl, issuerId, issuerImage } =
    issuerRenderInfoWithVerification(
      credential.issuer,
      verifyCredential?.result,
      credential
    )

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

      <CardDetail label="Issuance Date" value={issuanceDate} />
      <CardDetail label="Volunteer Name" value={fullName} />
      <CardDetail label="Volunteer Work" value={volunteerWork} />
      <CardDetail label="Organization" value={volunteerOrg} />
      <CardDetail label="Description" value={volunteerDescription} />
      <CardDetail label="Skills Gained" value={skillsGained} />
      <CardDetail label="Duration" value={duration} />
      <CardDetail label="Volunteer Dates" value={volunteerDates} />

      {(!!evidenceLink || !!portfolioEvidence.length) && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Evidence</Text>
          {!!evidenceLink && (
            <View style={{ marginBottom: portfolioEvidence.length ? 8 : 0 }}>
              <CardLink url={evidenceLink} disabled={urlsDisabled} />
            </View>
          )}
          {portfolioEvidence.map((p, idx) => (
            <View key={`${p.url}-${idx}`} style={{ marginBottom: 8 }}>
              <CardLink url={p.url} label={p.name} disabled={urlsDisabled} />
            </View>
          ))}
        </View>
      )}
      <CardDetail label="Evidence Description" value={evidenceDescription} />
    </View>
  )
}

export const volunteerCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'VolunteeringCredential',
  cardComponent: VolunteerCredentialCard,
  itemPropsResolver: (credential) => {
    const title = getCredentialName(credential)
    const { issuerName, issuerImage } = issuerRenderInfoWithVerification(
      credential.issuer,
      undefined,
      credential
    )

    return {
      title,
      subtitle: issuerName,
      image: issuerImage || defaultIssuerImage
    }
  }
}
