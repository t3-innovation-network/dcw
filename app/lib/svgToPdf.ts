import * as Print from 'expo-print'
import { File, Paths } from 'expo-file-system'
import Handlebars from 'handlebars'
import { PDF } from '../types/pdf'
import { IVerifiableCredential } from '@interop/data-integrity-core'

/**
 * Builds the final HTML for a credential's render template: substitutes the QR
 * code into the `{{ qr_code }}` placeholder, then Handlebars-renders the template
 * against the credential. Pure (no network, no native modules) so it can be unit
 * tested directly -- the actual HTML-to-PDF rendering happens natively in
 * `expo-print` and is not exercisable under jest.
 */
export function buildCredentialHtml(
  templateSource: string,
  credential: IVerifiableCredential,
  qrCodeBase64: string
): string {
  const source = templateSource.replace(
    '{{ qr_code }}',
    `'${'data:image/png;base64, ' + qrCodeBase64}'`
  )
  const template = Handlebars.compile(source)
  return template({ credential, qr_code: qrCodeBase64 })
}

/**
 * Derives the share-sheet filename for an exported credential PDF. expo-print
 * offers no `fileName` option, so the rendered file is renamed to this.
 */
export function pdfFileNameFor(credential: IVerifiableCredential): string {
  const safeName = `${credential.name ?? 'Credential'} Credential`.replace(
    /[^\w.() -]/g,
    '_'
  )
  return `${safeName}.pdf`
}

export async function convertSVGtoPDF(
  credential: IVerifiableCredential,
  publicLink: string | null,
  qrCodeBase64: string | null
): Promise<PDF | null> {
  if (!credential['renderMethod'] || !publicLink || !qrCodeBase64) {
    return null // Ensure we have the necessary data
  }

  let { renderMethod } = credential
  if (Array.isArray(renderMethod)) {
    renderMethod = renderMethod[0]
  }

  const templateURL = renderMethod.id // might want to sort if there are more than one renderMethod

  let source = ''

  // Fetch the template content
  if (templateURL) {
    try {
      const response = await fetch(templateURL)
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      source = await response.text()
    } catch (e) {
      console.log('Error fetching template:', e)
    }
  }

  const svg = buildCredentialHtml(source, credential, qrCodeBase64)

  // Render the HTML to a PDF. expo-print writes to a randomly-named file in the
  // cache directory and offers no `fileName` option, so rename the result to a
  // human-readable name -- that name is what the OS share sheet shows.
  const { uri } = await Print.printToFileAsync({ html: svg })

  const destination = new File(Paths.cache, pdfFileNameFor(credential))
  if (destination.exists) {
    destination.delete()
  }
  new File(uri).move(destination)

  return { uri: destination.uri }
}
