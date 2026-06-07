import type { StackScreenProps } from '@react-navigation/stack'
import { CredentialRequestParams } from '../../lib/credentialRequest'
import { ProfileRecordRaw } from '../../model'
import { IssuerInfoScreenParams } from '../../screens'

export type AcceptCredentialsNavigationParamList = {
  ApproveCredentialsScreen: {
    credentialRequestParams?: CredentialRequestParams
    rawProfileRecord: ProfileRecordRaw
  }
  ApproveCredentialScreen: {
    pendingCredentialId: string
    profileRecordId: string
  }
  IssuerInfoScreen: IssuerInfoScreenParams
}

export type ApproveCredentialsScreenProps = StackScreenProps<
  AcceptCredentialsNavigationParamList,
  'ApproveCredentialsScreen'
>
export type ApproveCredentialScreenProps = StackScreenProps<
  AcceptCredentialsNavigationParamList,
  'ApproveCredentialScreen'
>
export type IssuerInfoScreenAddProps = StackScreenProps<
  AcceptCredentialsNavigationParamList,
  'IssuerInfoScreen'
>
