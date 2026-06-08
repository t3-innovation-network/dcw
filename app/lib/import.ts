import { Buffer } from 'buffer'
import { keepLocalCopy, pick, types } from '@react-native-documents/picker'
import { File } from 'expo-file-system'
import { Platform } from 'react-native'

import { ProfileRecord } from '../model'
import { CredentialImportReport } from '../types/credential'
import { parseWalletContents } from './parseWallet'
import { unlockedWalletsFromTar } from './walletBackup'

// Type augmentation for global object
declare global {
  // eslint-disable-next-line no-var
  var base64ToArrayBuffer: ((base64Str: string) => ArrayBuffer) | undefined
}

export type ReportDetails = Record<string, string[]>

export function base64ToArrayBuffer(base64Str: string): ArrayBuffer {
  const bytes = Buffer.from(base64Str, 'base64')
  // Buffer may be a view into a larger pooled ArrayBuffer; slice to the
  // exact region this Buffer covers.
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )
}

// Local polyfill for base64ToArrayBuffer to avoid global dependency issues
if (typeof global.base64ToArrayBuffer !== 'function') {
  global.base64ToArrayBuffer = base64ToArrayBuffer
}

// Identify PNG open badges by content
export function isPngFile(base64Str: string): boolean {
  try {
    // Read just enough base64 characters to get the PNG header (8 bytes)
    const base64Header = base64Str.substring(0, 24)
    const arrayBuffer = base64ToArrayBuffer(base64Header)
    const header = new Uint8Array(arrayBuffer).slice(0, 8)
    const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const isPng = pngMagic.every((b, i) => header[i] === b)

    return isPng
  } catch (e) {
    return false
  }
}

function isTarBackup({
  path,
  fileName,
  base64Data
}: {
  path?: string
  fileName?: string
  base64Data?: string
}): boolean {
  const name = (fileName ?? path ?? '').toLowerCase()
  if (name.endsWith('.tar')) return true

  if (!base64Data) return false

  try {
    const bytes = Buffer.from(base64Data, 'base64')
    return (
      bytes.length >= 262 && bytes.subarray(257, 262).toString() === 'ustar'
    )
  } catch {
    return false
  }
}

export async function readFile(
  uri: string,
  fileName?: string
): Promise<string> {
  try {
    // expo-file-system's File works directly with `file://` and `content://`
    // URIs, so no path normalization is needed here.
    const file = new File(uri)

    if (isTarBackup({ path: uri, fileName })) {
      return file.base64()
    }

    // Read as base64 first
    const base64Data = await file.base64()

    if (isTarBackup({ base64Data })) {
      return base64Data
    }

    if (isPngFile(base64Data)) {
      // Decode base64 to UTF-8 string for embedded JSON extraction
      const arrayBuffer = base64ToArrayBuffer(base64Data)
      const decodedString = new TextDecoder('utf-8').decode(arrayBuffer)

      // Search for the OpenBadge JSON inside PNG
      const keyword = 'openbadgecredential'
      const keywordIndex = decodedString.indexOf(keyword)

      if (keywordIndex !== -1) {
        const startIndex = keywordIndex + keyword.length
        const objectStart = decodedString.indexOf('{', startIndex)

        if (objectStart !== -1) {
          let braceCount = 0
          let objectEnd = objectStart

          while (objectEnd < decodedString.length) {
            if (decodedString[objectEnd] === '{') braceCount++
            else if (decodedString[objectEnd] === '}') braceCount--

            if (braceCount === 0) break
            objectEnd++
          }

          const objectString = decodedString.slice(objectStart, objectEnd + 1)
          try {
            const parsedObject = JSON.parse(objectString)

            return JSON.stringify(parsedObject, null, 2)
          } catch (error) {
            return ''
          }
        } else {
          return ''
        }
      } else {
        return ''
      }
    } else {
      const fileContent = await file.text()
      return fileContent
    }
  } catch (error) {
    console.error('Error reading file:', error)
    return ''
  }
}

export async function pickAndReadFile(): Promise<string> {
  try {
    const [file] = await pick({
      type: [types.allFiles]
    })

    let uri = file.uri

    if (Platform.OS === 'ios') {
      // `pick` no longer copies the file into app storage, so request a local
      // copy explicitly (the v9 `copyTo: 'cachesDirectory'` equivalent).
      const [copy] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? 'imported_file' }],
        destination: 'cachesDirectory'
      })
      if (copy.status !== 'success') {
        throw new Error('Unable to copy selected file on iOS')
      }
      uri = copy.localUri
    }

    // On Android `uri` may be a `content://` URI; expo-file-system reads those
    // directly via SAF, so the previous copy-to-temp step is no longer needed.
    if (!new File(uri).exists) throw new Error(`File not found at ${uri}`)

    const content = await readFile(uri, file.name ?? undefined)
    return content
  } catch (err) {
    throw new Error('Unable to read selected file.')
  }
}

export function credentialReportDetailsFrom(
  report: CredentialImportReport
): ReportDetails {
  const sectionText: Record<string, (n: number, s: string) => string> = {
    success: (n, s) => `${n} item${s} successfully imported`,
    duplicate: (n, s) => `${n} duplicate item${s} ignored`,
    failed: (n, s) => `${n} item${s} failed to complete`
  }

  return Object.fromEntries<string[]>(
    Object.entries(report)
      .filter(([, value]) => value.length > 0)
      .map(([key, value]) => {
        const plural = value.length !== 1 ? 's' : ''
        const headerText = sectionText[key](value.length, plural)
        return [headerText, value]
      })
  )
}

export function aggregateCredentialReports(
  reports: CredentialImportReport[]
): CredentialImportReport {
  return reports.reduce((prevValue, curValue) => ({
    success: prevValue.success.concat(curValue.success),
    duplicate: prevValue.duplicate.concat(curValue.duplicate),
    failed: prevValue.failed.concat(curValue.failed)
  }))
}

export async function importProfileFrom(data: string): Promise<ReportDetails> {
  if (tryParseJson(data) === null) {
    return importWalletFromTar(data)
  }

  const profileImportReport = await ProfileRecord.importProfileRecord(data)

  let userIdStatusText: string
  if (profileImportReport.profileDuplicate) {
    userIdStatusText = 'Profile already exists (skipped)'
  } else if (profileImportReport.userIdImported) {
    userIdStatusText = 'User ID successfully imported'
  } else {
    userIdStatusText = 'User ID failed to import'
  }

  const reportDetails = {
    [userIdStatusText]: [],
    ...credentialReportDetailsFrom(profileImportReport.credentials)
  }

  return reportDetails
}

export async function importWalletFrom(data: string): Promise<ReportDetails> {
  const parsedData = tryParseJson(data)
  if (parsedData === null) {
    return importWalletFromTar(data)
  }
  if (!(parsedData instanceof Array)) {
    return importProfileFrom(data)
  }

  const items: unknown[] = parsedData

  const reports = await Promise.all(
    items.map(async (item, index) => {
      const rawWallet = JSON.stringify(item)
      const report = await ProfileRecord.importProfileRecord(rawWallet)

      // Extract profile name from the wallet data
      try {
        const { profileMetadata } = parseWalletContents(rawWallet)
        const profileName =
          profileMetadata?.data?.profileName || 'Untitled Profile'
        return { ...report, profileName }
      } catch {
        return { ...report, profileName: `Profile ${index + 1}` }
      }
    })
  )

  const credentialReports = reports.map(({ credentials }) => credentials)
  const totalCredentialsReport = aggregateCredentialReports(credentialReports)

  // Collect profile names by import status
  const profilesImported = reports
    .filter((r) => r.userIdImported)
    .map((r) => r.profileName)
  const profilesDuplicate = reports
    .filter((r) => r.profileDuplicate)
    .map((r) => r.profileName)
  const profilesFailed = reports
    .filter((r) => !r.userIdImported && !r.profileDuplicate)
    .map((r) => r.profileName)

  const reportDetails: ReportDetails = {
    ...credentialReportDetailsFrom(totalCredentialsReport)
  }

  if (profilesImported.length > 0) {
    const plural = profilesImported.length !== 1 ? 's' : ''
    reportDetails[
      `${profilesImported.length} profile${plural} successfully imported`
    ] = profilesImported
  }

  if (profilesDuplicate.length > 0) {
    const plural = profilesDuplicate.length !== 1 ? 's' : ''
    reportDetails[
      `${profilesDuplicate.length} duplicate profile${plural} skipped`
    ] = profilesDuplicate
  }

  if (profilesFailed.length > 0) {
    const plural = profilesFailed.length !== 1 ? 's' : ''
    reportDetails[
      `${profilesFailed.length} profile${plural} failed to import`
    ] = profilesFailed
  }

  return reportDetails
}

function tryParseJson(data: string): unknown | null {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export async function importWalletFromTar(
  base64Tar: string
): Promise<ReportDetails> {
  const wallets = await unlockedWalletsFromTar(base64Tar)

  const reports = await Promise.all(
    wallets.map(async (rawWallet, index) => {
      const report = await ProfileRecord.importProfileRecord(rawWallet)

      try {
        const { profileMetadata } = parseWalletContents(rawWallet)
        const profileName =
          profileMetadata?.data?.profileName || 'Untitled Profile'
        return { ...report, profileName }
      } catch {
        return { ...report, profileName: `Profile ${index + 1}` }
      }
    })
  )

  const credentialReports = reports.map(({ credentials }) => credentials)
  const totalCredentialsReport = aggregateCredentialReports(credentialReports)

  const profilesImported = reports
    .filter((r) => r.userIdImported)
    .map((r) => r.profileName)
  const profilesDuplicate = reports
    .filter((r) => r.profileDuplicate)
    .map((r) => r.profileName)
  const profilesFailed = reports
    .filter((r) => !r.userIdImported && !r.profileDuplicate)
    .map((r) => r.profileName)

  const reportDetails: ReportDetails = {
    ...credentialReportDetailsFrom(totalCredentialsReport)
  }

  if (profilesImported.length > 0) {
    const plural = profilesImported.length !== 1 ? 's' : ''
    reportDetails[
      `${profilesImported.length} profile${plural} successfully imported`
    ] = profilesImported
  }

  if (profilesDuplicate.length > 0) {
    const plural = profilesDuplicate.length !== 1 ? 's' : ''
    reportDetails[
      `${profilesDuplicate.length} duplicate profile${plural} skipped`
    ] = profilesDuplicate
  }

  if (profilesFailed.length > 0) {
    const plural = profilesFailed.length !== 1 ? 's' : ''
    reportDetails[
      `${profilesFailed.length} profile${plural} failed to import`
    ] = profilesFailed
  }

  return reportDetails
}

export async function importWalletOrProfileFrom(
  data: string
): Promise<ReportDetails> {
  const parsedData = tryParseJson(data)

  if (parsedData === null) {
    return importWalletFromTar(data)
  }

  if (parsedData instanceof Array) {
    return importWalletFrom(data)
  }

  return importProfileFrom(data)
}
