import React, { useMemo } from 'react'
import { View, ScrollView, Text } from 'react-native'

//import { CredentialCard, VerificationCard, VerificationStatusCard } from '../../components';
import CredentialCard from '../../components/CredentialCard/CredentialCard'
import VerificationStatusCard from '../../components/VerificationStatusCard/VerificationStatusCard'
import NavHeader from '../../components/NavHeader/NavHeader'
import type { ApproveCredentialScreenProps } from '../../navigation'
import { CredentialRecord } from '../../model'
import dynamicStyleSheet from './ApproveCredentialScreen.styles'
import { useDynamicStyles, usePendingCredential } from '../../hooks'
import { navigationRef } from '../../navigation/navigationRef'
import { useVerifyCredential } from '../../hooks'
import { shouldDisableUrls } from '../../lib/credentialSecurity'

export default function ApproveCredentialScreen({
  navigation,
  route
}: ApproveCredentialScreenProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { pendingCredentialId, profileRecordId } = route.params
  const pendingCredential = usePendingCredential(pendingCredentialId)
  const { credential } = pendingCredential
  const rawCredentialRecord = useMemo(
    () => CredentialRecord.rawFrom({ credential, profileRecordId }),
    [credential]
  )
  const verifyPayload = useVerifyCredential(rawCredentialRecord, true)
  const urlsDisabled = shouldDisableUrls(verifyPayload?.result)

  function goToIssuerInfo(issuerId: string) {
    if (navigationRef.isReady()) {
      navigationRef.navigate('AcceptCredentialsNavigation', {
        screen: 'IssuerInfoScreen',
        params: { issuerId, rawCredentialRecord }
      })
    }
  }

  return (
    <>
      <NavHeader title="Credential Preview" goBack={navigation.goBack} />
      <ScrollView>
        <View style={styles.container}>
          {urlsDisabled && (
            <Text style={styles.warningText}>
              ⚠️ Links disabled - unrecognized issuer
            </Text>
          )}
          <CredentialCard
            rawCredentialRecord={rawCredentialRecord}
            onPressIssuer={goToIssuerInfo}
          />
          {/* <VerificationCard rawCredentialRecord={rawCredentialRecord} isButton /> */}
          {verifyPayload && (
            <VerificationStatusCard
              credential={credential}
              verifyPayload={verifyPayload}
            />
          )}
        </View>
      </ScrollView>
    </>
  )
}
