import { keepLocalCopy, pick } from '@react-native-documents/picker'

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  keepLocalCopy: jest.fn(),
  types: {
    allFiles: '*/*'
  }
}))

// Controllable mock of expo-file-system's File API. `text()`/`base64()`/`exists`
// are routed through shared jest.fn()s so each test can script the reads.
const mockText = jest.fn()
const mockBase64 = jest.fn()
const mockExists = jest.fn().mockReturnValue(true)

jest.mock('expo-file-system', () => {
  class File {
    uri: string
    constructor(...uris: unknown[]) {
      this.uri = uris
        .map((u) =>
          u && typeof u === 'object' && 'uri' in u ? (u as any).uri : String(u)
        )
        .join('/')
    }
    get exists() {
      return mockExists(this.uri)
    }
    text() {
      return mockText(this.uri)
    }
    base64() {
      return mockBase64(this.uri)
    }
  }
  return {
    File,
    Paths: {
      document: { uri: 'file:///mock/document' },
      cache: { uri: 'file:///mock/cache' }
    }
  }
})

jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn()
}))

const mockImportProfileRecord = jest.fn()

// Mock the entire model module
jest.mock('../app/model', () => ({
  ProfileRecord: {
    importProfileRecord: mockImportProfileRecord
  }
}))

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android'
  }
}))

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android'
}))

// Import after mocking
const {
  isPngFile,
  readFile,
  pickAndReadFile,
  importProfileFrom,
  importWalletFrom,
  importWalletOrProfileFrom,
  aggregateCredentialReports,
  credentialReportDetailsFrom
} = require('../app/lib/import')

describe('Utility Functions', () => {
  describe('isPngFile', () => {
    it('should return true for valid PNG base64', () => {
      const pngHeader = 'iVBORw0KGgo=' // base64 of PNG magic number
      const result = isPngFile(pngHeader + 'restofbase64')
      expect(result).toBe(true)
    })

    it('should return false for non-PNG base64', () => {
      const fakeHeader = btoa('notapngfileheader')
      expect(isPngFile(fakeHeader)).toBe(false)
    })
  })

  describe('readFile', () => {
    it('should return parsed embedded JSON from PNG file', async () => {
      // Create proper fake PNG data with embedded JSON
      const pngMagicBytes = '\x89PNG\r\n\x1a\n' // PNG magic bytes
      const embeddedJson = JSON.stringify({
        openbadgecredential: { name: 'Test' }
      })
      const pngWithEmbeddedData =
        pngMagicBytes + `randomtextopenbadgecredential${embeddedJson}`
      const fakeContent = Buffer.from(pngWithEmbeddedData, 'binary').toString(
        'base64'
      )

      mockBase64.mockResolvedValueOnce(fakeContent)

      const result = await readFile('fakepath')
      expect(JSON.parse(result)).toHaveProperty(
        'openbadgecredential.name',
        'Test'
      )
    })

    it('should return plain content for non-PNG file', async () => {
      mockBase64.mockResolvedValueOnce('bm90YXBuZw==') // base64 of "notapng"
      mockText.mockResolvedValueOnce('{"key":"value"}')

      const result = await readFile('file.json')
      expect(JSON.parse(result)).toHaveProperty('key', 'value')
    })
  })

  describe('pickAndReadFile', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks()
    })

    it('should pick and read a content:// file on Android', async () => {
      // Mock Platform.OS for this test
      const mockPlatform = require('react-native').Platform
      mockPlatform.OS = 'android'
      ;(pick as jest.Mock).mockResolvedValueOnce([
        {
          uri: 'content://some/file.json',
          name: 'badge file (1).json'
        }
      ])
      mockBase64.mockResolvedValueOnce('bm90YXBuZw==') // base64
      mockText.mockResolvedValueOnce('{"android": "content"}')

      const result = await pickAndReadFile()
      // The content:// URI is read directly via expo-file-system (no temp copy).
      expect(mockBase64).toHaveBeenCalledWith('content://some/file.json')
      expect(result).toContain('content')
    })

    it('should pick and read a file on Android', async () => {
      // Mock Platform.OS for this test
      const mockPlatform = require('react-native').Platform
      mockPlatform.OS = 'android'

      const fakeUri = 'file://test.json'

      ;(pick as jest.Mock).mockResolvedValueOnce([
        {
          uri: fakeUri,
          name: 'test.json'
        }
      ])
      mockBase64.mockResolvedValueOnce('bm90YXBuZw==') // base64
      mockText.mockResolvedValueOnce('{"android":true}')

      const result = await pickAndReadFile()
      expect(result).toContain('true')
    })

    it('should pick and read a file on iOS', async () => {
      // Mock Platform.OS for this test
      const mockPlatform = require('react-native').Platform
      mockPlatform.OS = 'ios'

      const fakeUri = 'file://test.json'

      ;(pick as jest.Mock).mockResolvedValueOnce([
        {
          uri: fakeUri,
          name: 'test.json'
        }
      ])
      ;(keepLocalCopy as jest.Mock).mockResolvedValueOnce([
        { status: 'success', localUri: fakeUri }
      ])
      mockBase64.mockResolvedValueOnce('bm90YXBuZw==') // base64
      mockText.mockResolvedValueOnce('{"ios":true}')

      const result = await pickAndReadFile()
      expect(result).toContain('true')
    })

    it('should pick a file and read it', async () => {
      // Platform.OS is left as 'ios' from the previous test
      const fakeUri = 'file://test.json'

      ;(pick as jest.Mock).mockResolvedValueOnce([
        {
          uri: fakeUri,
          name: 'test.json'
        }
      ])
      ;(keepLocalCopy as jest.Mock).mockResolvedValueOnce([
        { status: 'success', localUri: fakeUri }
      ])
      mockBase64.mockResolvedValueOnce('bm90YXBuZw==') // base64
      mockText.mockResolvedValueOnce('{"test":123}')

      const result = await pickAndReadFile()
      expect(result).toContain('123')
    })
  })

  describe('importProfileFrom', () => {
    it('should process profile import', async () => {
      mockImportProfileRecord.mockResolvedValueOnce({
        userIdImported: true,
        credentials: {
          success: ['a'],
          duplicate: [],
          failed: []
        }
      })

      const report = await importProfileFrom('{}')
      expect(report).toHaveProperty('User ID successfully imported')
      expect(report).toHaveProperty('1 item successfully imported')
    })
  })

  describe('importWalletFrom', () => {
    it('should process wallet import with multiple records', async () => {
      mockImportProfileRecord
        .mockResolvedValueOnce({
          userIdImported: true,
          credentials: { success: ['1'], duplicate: [], failed: [] }
        })
        .mockResolvedValueOnce({
          userIdImported: true,
          credentials: { success: [], duplicate: ['2'], failed: [] }
        })

      const json = JSON.stringify([{ id: 1 }, { id: 2 }])
      const report = await importWalletFrom(json)

      expect(report).toHaveProperty('1 item successfully imported')
      expect(report).toHaveProperty('1 duplicate item ignored')
    })
  })

  describe('importWalletOrProfileFrom', () => {
    it('should call wallet import for an array', async () => {
      mockImportProfileRecord.mockResolvedValue({
        userIdImported: true,
        credentials: { success: ['x'], duplicate: [], failed: [] }
      })

      const result = await importWalletOrProfileFrom(JSON.stringify([{}]))
      expect(result).toHaveProperty('1 item successfully imported')
      expect(mockImportProfileRecord).toHaveBeenCalled()
    })

    it('should call profile import for an object', async () => {
      mockImportProfileRecord.mockResolvedValue({
        userIdImported: true,
        credentials: { success: [], duplicate: ['a'], failed: ['b'] }
      })

      const result = await importWalletOrProfileFrom(JSON.stringify({}))
      expect(result).toHaveProperty('1 duplicate item ignored')
      expect(result).toHaveProperty('1 item failed to complete')
    })
  })

  describe('aggregateCredentialReports', () => {
    it('should aggregate multiple reports', () => {
      const reports = [
        { success: ['1'], duplicate: ['2'], failed: [] },
        { success: [], duplicate: ['3'], failed: ['4'] }
      ]

      const result = aggregateCredentialReports(reports)
      expect(result.success).toHaveLength(1)
      expect(result.duplicate).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
    })
  })

  describe('credentialReportDetailsFrom', () => {
    it('should format credential sections properly', () => {
      const details = credentialReportDetailsFrom({
        success: ['1', '2'],
        duplicate: ['3'],
        failed: []
      })

      expect(Object.keys(details)).toEqual([
        '2 items successfully imported',
        '1 duplicate item ignored'
      ])
    })
  })
})
