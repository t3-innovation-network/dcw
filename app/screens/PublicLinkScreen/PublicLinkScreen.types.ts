import { CredentialRecordRaw } from '../../model'

export enum PublicLinkScreenMode {
  Default,
  ShareCredential
}

export type PublicLinkScreenParams = {
  rawCredentialRecord: CredentialRecordRaw
  screenMode?: PublicLinkScreenMode
}
