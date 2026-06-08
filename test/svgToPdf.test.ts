import { convertSVGtoPDF } from '../app/lib/svgToPdf'
import * as Print from 'expo-print'
import Handlebars from 'handlebars'
import { mockCredential } from '../app/mock/credential'

// Mocks. `virtual: true` lets this register before `pnpm install` fetches the
// (not-yet-installed) expo-print package.
jest.mock(
  'expo-print',
  () => ({
    printToFileAsync: jest.fn()
  }),
  { virtual: true }
)

// Mock expo-file-system's File/Paths so the post-render rename is exercised
// without touching a real filesystem. `move()` is a no-op; the destination URI
// is derived deterministically from `Paths.cache` + the generated file name.
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
      return false
    }
    delete() {}
    move() {}
  }
  return {
    File,
    Paths: {
      document: { uri: 'file:///doc' },
      cache: { uri: 'file:///cache' }
    }
  }
})

jest.mock('handlebars', () => ({
  compile: jest.fn()
}))

global.fetch = jest.fn()

describe('convertSVGtoPDF', () => {
  const publicLink = 'https://example.com/publicLink'
  const qrCodeBase64 = 'testBase64QRCode'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return null if required data is missing', async () => {
    // Missing publicLink
    expect(await convertSVGtoPDF(mockCredential, null, qrCodeBase64)).toBeNull()

    // Missing qrCodeBase64
    expect(await convertSVGtoPDF(mockCredential, publicLink, null)).toBeNull()
  })

  it('should handle fetch errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network Error')
    )

    const result = await convertSVGtoPDF(
      mockCredential,
      publicLink,
      qrCodeBase64
    )

    // If fetch fails, the result should be null
    expect(result).toBeNull()
  })

  it('should handle invalid HTTP response when fetching template', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    const result = await convertSVGtoPDF(
      mockCredential,
      publicLink,
      qrCodeBase64
    )

    // If response is not OK, the result should be null
    expect(result).toBeNull()
  })

  it('should fetch the template and generate a PDF', async () => {
    const modifiedCredential = {
      ...mockCredential,
      renderMethod: [
        {
          id: 'https://raw.githubusercontent.com/digitalcredentials/test-files/main/html-templates/rendermethod-qrcode-test.html',
          type: 'HTML'
        }
      ]
    }

    const templateHtml = '<html><body>{{ qr_code }}</body></html>'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(templateHtml)
    })

    // Mock Handlebars.compile to return a function that generates the final HTML with embedded QR code
    const mockCompiledTemplate = jest
      .fn()
      .mockReturnValue((data: { qr_code: any }) => {
        return `<html><body>data:image/png;base64, ${data.qr_code}</body></html>`
      })
    ;(Handlebars.compile as jest.Mock).mockImplementation(mockCompiledTemplate)
    ;(Print.printToFileAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file:///cache/print-temp.pdf',
      numberOfPages: 1
    })

    const result = await convertSVGtoPDF(
      modifiedCredential,
      publicLink,
      qrCodeBase64
    )

    // Ensure fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      modifiedCredential.renderMethod[0].id
    )

    // Ensure expo-print rendered the correct HTML
    expect(Print.printToFileAsync).toHaveBeenCalledWith({
      html: `<html><body>data:image/png;base64, ${qrCodeBase64}</body></html>`
    })

    // The rendered PDF is renamed to a human-readable cache file. mockCredential
    // has no `name`, so the fallback "Credential" is used.
    expect(result).toEqual({ uri: 'file:///cache/Credential Credential.pdf' })
  })

  it('should embed the qrCodeBase64 correctly in the template', async () => {
    const modifiedCredential = {
      ...mockCredential,
      renderMethod: [
        {
          id: 'https://raw.githubusercontent.com/digitalcredentials/test-files/main/html-templates/rendermethod-qrcode-test.html',
          type: 'HTML'
        }
      ]
    }

    const templateHtml = '<html><body>{{ qr_code }}</body></html>'
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(templateHtml)
    })

    const mockCompiledTemplate = jest
      .fn()
      .mockReturnValue((data: { qr_code: any }) => {
        return `<html><body>data:image/png;base64, ${data.qr_code}</body></html>`
      })
    ;(Handlebars.compile as jest.Mock).mockImplementation(mockCompiledTemplate)
    ;(Print.printToFileAsync as jest.Mock).mockResolvedValueOnce({
      uri: 'file:///cache/print-temp.pdf',
      numberOfPages: 1
    })

    await convertSVGtoPDF(modifiedCredential, publicLink, qrCodeBase64)

    // Check that the HTML with the correct QR code embedded was passed to expo-print
    expect(Print.printToFileAsync).toHaveBeenCalledWith({
      html: `<html><body>data:image/png;base64, ${qrCodeBase64}</body></html>`
    })
  })
})
