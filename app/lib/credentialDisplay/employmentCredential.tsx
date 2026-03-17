import React, { useContext } from 'react'
import { View, Text } from 'react-native'
import { Button } from 'react-native-elements'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import type { CredentialCardProps, CredentialDisplayConfig } from '.'
import { mixins } from '../../styles'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import { DATE_FORMAT } from '../../../app.config'
import defaultIssuerImage from '../../assets/defaultIssuer.png'
import { DidRegistryContext } from '../../init/registries'
import { shouldDisableUrls } from '../credentialSecurity'
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.d'
import type { EmploymentCredentialSubject } from '../../types/credential'
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

function EmploymentCredentialCard({
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
  const subject = getSubject(credential) as EmploymentCredentialSubject

  const title = getCredentialName(credential)
  const issuanceDate = formatMaybeDate(credential?.issuanceDate, DATE_FORMAT)
  const fullName = asNonEmptyString(subject?.fullName)
  const company = asNonEmptyString(subject?.company)
  const role = asNonEmptyString(subject?.role)
  const credentialName = asNonEmptyString(subject?.credentialName)
  const credentialDuration = asNonEmptyString(subject?.credentialDuration)
  const credentialDescription = asNonEmptyString(subject?.credentialDescription)
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
      <CardDetail label="Employee Name" value={fullName} />
      <CardDetail label="Company" value={company} />
      <CardDetail label="Role" value={role} />
      <CardDetail label="Credential Name" value={credentialName} />
      <CardDetail label="Credential Duration" value={credentialDuration} />
      <CardDetail
        label="Credential Description"
        value={credentialDescription}
      />

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

export const employmentCredentialDisplayConfig: CredentialDisplayConfig = {
  credentialType: 'EmploymentCredential',
  cardComponent: EmploymentCredentialCard,
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
