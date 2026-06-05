// Navigation Components - removed to break cycles
// Components should be imported directly

// Type Definitions
export * from './RootNavigation/RootNavigation.types'
export * from './HomeNavigation/HomeNavigation.types'
export * from './SettingsNavigation/SettingsNavigation.types'
export * from './SetupNavigation/SetupNavigation.types'
export * from './AddNavigation/AddNavigation.types'
export * from './AcceptCredentialsNavigation/AcceptCredentialsNavigation.types'
export * from './CredentialNavigation/CredentialNavigation.types'
export * from './ShareNavigation/ShareNavigation.types'
export * from './ExchangeCredentialsNavigation/ExchangeCredentialsNavigation.types'

export { navigationRef } from './navigationRef'

// Remove component re-exports to break cycles - import directly instead

/**
 * If screens are re-used, we need to make union types for their
 * props
 */
import { CredentialScreenHomeProps } from './CredentialNavigation/CredentialNavigation.types'
import { CredentialScreenShareProps } from './ShareNavigation/ShareNavigation.types'
import { CredentialScreenSettingsProps } from './SettingsNavigation/SettingsNavigation.types'
export type CredentialScreenProps =
  | CredentialScreenHomeProps
  | CredentialScreenShareProps
  | CredentialScreenSettingsProps

import { DetailsScreenSettingsProps } from './SettingsNavigation/SettingsNavigation.types'
import { DetailsScreenSetupProps } from './SetupNavigation/SetupNavigation.types'
export type DetailsScreenProps =
  | DetailsScreenSettingsProps
  | DetailsScreenSetupProps

import { PublicLinkScreenCredentialProps } from './CredentialNavigation/CredentialNavigation.types'
import { PublicLinkScreenShareProps } from './ShareNavigation/ShareNavigation.types'
import { PublicLinkScreenSettingsProps } from './SettingsNavigation/SettingsNavigation.types'
export type PublicLinkScreenProps =
  | PublicLinkScreenCredentialProps
  | PublicLinkScreenShareProps
  | PublicLinkScreenSettingsProps

import { IssuerInfoScreenCredentialProps } from './CredentialNavigation/CredentialNavigation.types'
import { IssuerInfoScreenAddProps } from './AcceptCredentialsNavigation/AcceptCredentialsNavigation.types'
export type IssuerInfoScreenProps =
  | IssuerInfoScreenCredentialProps
  | IssuerInfoScreenAddProps
