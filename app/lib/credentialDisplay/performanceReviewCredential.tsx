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
import { CredentialNavigationParamList } from '../../navigation/CredentialNavigation/CredentialNavigation.types'
import type { PerformanceReviewCredentialSubject } from '../../types/credential'
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

type NavigationProp = StackNavigationProp<CredentialNavigationParamList>

function PerformanceReviewCredentialCard({
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

  const subject = getSubject(credential) as PerformanceReviewCredentialSubject

  const { issuerName, issuerUrl, issuerId, issuerImage } =
    issuerRenderInfoWithVerification(
      credential.issuer,
      verifyCredential?.result
    )

  const portfolioEvidence = evidenceFromCredential(credential, subject)

  const reviewStart = formatMaybeDate(subject?.reviewStartDate, DATE_FORMAT)
  const reviewEnd = formatMaybeDate(subject?.reviewEndDate, DATE_FORMAT)

  return (
    <View style={styles.cardContainer}>
      <View style={styles.dataContainer}>
        {urlsDisabled && (
          <Text style={styles.warningText}>
            ⚠️ Links disabled - unrecognized issuer
          </Text>
        )}
        <Text style={styles.header} accessibilityRole="header">
          Performance Review Credential From{' '}
          {asNonEmptyString(subject?.fullName)} For{' '}
          {asNonEmptyString(subject?.employeeName)}
        </Text>

        <Text style={styles.dataLabel}>Issuer</Text>
        <View style={styles.flexRow}>
          <CardImage
            source={issuerImage || defaultIssuerImage}
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

      <CardDetail
        label="Employee Name"
        value={asNonEmptyString(subject?.employeeName)}
      />
      <View>
        {!!subject?.employeeJobTitle && (
          <CardDetail
            label="Job Title"
            value={asNonEmptyString(subject?.employeeJobTitle)}
          />
        )}
        {!!subject?.company && (
          <CardDetail
            label="Company"
            value={asNonEmptyString(subject?.company)}
          />
        )}
        {!!subject?.role && (
          <CardDetail label="Role" value={asNonEmptyString(subject?.role)} />
        )}
      </View>

      {!!reviewStart && !!reviewEnd ? (
        <View style={styles.flexRow}>
          <CardDetail label="Review Start Date" value={reviewStart} />
          <CardDetail label="Review End Date" value={reviewEnd} />
        </View>
      ) : null}

      <CardDetail
        label="Review Duration"
        value={asNonEmptyString(subject?.reviewDuration)}
      />

      {!!subject?.jobKnowledgeRating ||
      !!subject?.teamworkRating ||
      !!subject?.initiativeRating ||
      !!subject?.communicationRating ||
      !!subject?.overallRating ? (
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Ratings</Text>
          <View style={styles.flexRow}>
            {!!subject?.jobKnowledgeRating && (
              <CardDetail
                label="Job Knowledge"
                value={`${asNonEmptyString(subject?.jobKnowledgeRating)} out of 5`}
              />
            )}
            {!!subject?.teamworkRating && (
              <CardDetail
                label="Teamwork"
                value={`${asNonEmptyString(subject?.teamworkRating)} out of 5`}
              />
            )}
          </View>
          {!!subject?.initiativeRating && (
            <CardDetail
              label="Initiative"
              value={`${asNonEmptyString(subject?.initiativeRating)} out of 5`}
            />
          )}
          {!!subject?.communicationRating && (
            <CardDetail
              label="Communication"
              value={`${asNonEmptyString(subject?.communicationRating)} out of 5`}
            />
          )}
          <CardDetail
            label="Overall"
            value={`${asNonEmptyString(subject?.overallRating)} out of 5`}
          />
        </View>
      ) : null}

      {!!subject?.reviewComments && (
        <View style={styles.dataContainer}>
          <CardDetail
            label="Comments"
            value={asNonEmptyString(subject?.reviewComments)}
          />
        </View>
      )}
      {!!subject?.goalsNext && (
        <View style={styles.dataContainer}>
          <CardDetail
            label="Goals Next"
            value={asNonEmptyString(subject?.goalsNext)}
          />
        </View>
      )}

      {!!subject?.evidenceLink && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Evidence</Text>
          <CardLink
            url={asNonEmptyString(subject?.evidenceLink)}
            disabled={urlsDisabled}
          />
        </View>
      )}
      <CardDetail
        label="Evidence Description"
        value={asNonEmptyString(subject?.evidenceDescription)}
      />

      {!!portfolioEvidence.length && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>Portfolio</Text>
          {portfolioEvidence.map((p, idx) => (
            <View key={`${p.url}-${idx}`} style={{ marginBottom: 8 }}>
              <CardLink url={p.url} label={p.name} disabled={urlsDisabled} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export const performanceReviewCredentialDisplayConfig: CredentialDisplayConfig =
  {
    credentialType: 'PerformanceReviewCredential',
    cardComponent: PerformanceReviewCredentialCard,
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
