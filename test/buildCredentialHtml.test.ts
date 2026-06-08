import { buildCredentialHtml, pdfFileNameFor } from '../app/lib/svgToPdf'
import { IVerifiableCredential } from '@interop/data-integrity-core'

// NOTE: this suite deliberately does NOT mock Handlebars -- it exercises the
// real template rendering, which is the JS-side logic we own. The actual
// HTML-to-PDF conversion is native (expo-print) and cannot run under jest; see
// svgToPdf.test.ts for the orchestration-level test.

const credential = (name?: string) => ({ name }) as IVerifiableCredential

describe('buildCredentialHtml', () => {
  const qrCodeBase64 = 'QR_BASE64_DATA'

  it('substitutes the QR placeholder and renders credential fields', () => {
    const template =
      '<html><body><h1>{{credential.name}}</h1><img src={{ qr_code }} /></body></html>'

    const html = buildCredentialHtml(
      template,
      credential('Bachelor of Science'),
      qrCodeBase64
    )

    expect(html).toBe(
      '<html><body><h1>Bachelor of Science</h1>' +
        "<img src='data:image/png;base64, QR_BASE64_DATA' /></body></html>"
    )
  })

  it('renders the QR data URI when referenced via the Handlebars variable', () => {
    // `{{qr_code}}` (no spaces) is not touched by the string replacement, so it
    // flows through Handlebars from the `qr_code` template variable instead.
    const html = buildCredentialHtml(
      '<img alt="qr" src="{{qr_code}}" />',
      credential('Diploma'),
      qrCodeBase64
    )

    expect(html).toBe('<img alt="qr" src="QR_BASE64_DATA" />')
  })

  it('HTML-escapes credential values so they cannot break the document', () => {
    const html = buildCredentialHtml(
      '<p>{{credential.name}}</p>',
      credential('Art & Design <script>'),
      qrCodeBase64
    )

    expect(html).toBe('<p>Art &amp; Design &lt;script&gt;</p>')
  })

  it('leaves missing credential fields blank rather than throwing', () => {
    const html = buildCredentialHtml(
      '<p>{{credential.name}}</p>',
      credential(undefined),
      qrCodeBase64
    )

    expect(html).toBe('<p></p>')
  })
})

describe('pdfFileNameFor', () => {
  it('builds a share-sheet name from the credential name', () => {
    expect(pdfFileNameFor(credential('Bachelor of Science'))).toBe(
      'Bachelor of Science Credential.pdf'
    )
  })

  it('falls back to "Credential" when the credential has no name', () => {
    expect(pdfFileNameFor(credential(undefined))).toBe(
      'Credential Credential.pdf'
    )
  })

  it('sanitizes characters that are unsafe in a filename', () => {
    expect(pdfFileNameFor(credential("Master's / PhD: Math"))).toBe(
      'Master_s _ PhD_ Math Credential.pdf'
    )
  })
})
