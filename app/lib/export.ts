import { ProfileRecordRaw } from '../model'
import { shareBinaryFile } from './shareData'
import { buildFullWalletTar, buildProfileTar } from './walletBackup'

export async function exportProfile(
  rawProfileRecord: ProfileRecordRaw
): Promise<void> {
  const base64Tar = await buildProfileTar(rawProfileRecord)
  await shareBinaryFile('Profile Backup.tar', base64Tar, 'application/x-tar')
}

export async function exportWallet(): Promise<void> {
  const base64Tar = await buildFullWalletTar()
  await shareBinaryFile('Wallet Backup.tar', base64Tar, 'application/x-tar')
}
