import { StackScreenProps } from '@react-navigation/stack'
import { SettingsNavigationParamList } from '../../navigation/SettingsNavigation/SettingsNavigation.types'
import { ProfileRecordRaw } from '../../model'

export type ProfileCredentialScreenProps = StackScreenProps<
  SettingsNavigationParamList,
  'ProfileCredentialScreen'
>

export type ProfileCredentialScreenParams = {
  rawProfileRecord: ProfileRecordRaw
}
