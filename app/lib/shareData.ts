import { Platform } from 'react-native'
import Share from 'react-native-share'
import { File, Paths } from 'expo-file-system'

export async function shareData(
  fileName: string,
  data: string,
  type = 'text/plain'
): ReturnType<typeof Share.open> {
  const file = new File(Paths.document, fileName)

  if (file.exists) {
    file.delete()
  }

  file.write(data)

  /**
   * On Android, the clipboard share activity only supports strings (copying
   * the file URL if `message` is not provided). To support clipboard
   * functionality here, the `message` parameter must be supplied with the
   * stringified JSON of the file.
   *
   * On iOS, the clipboard supports file sharing so the `message` parameter
   * should be omitted. Including it would result in sharing both the file and
   * the JSON string.
   */
  return Share.open({
    title: fileName,
    url: file.uri,
    type,
    subject: fileName,
    message: Platform.OS === 'ios' ? undefined : data
  })
}

export async function shareBinaryFile(
  fileName: string,
  base64Data: string,
  mimeType = 'application/octet-stream'
) {
  const file = new File(Paths.document, fileName)

  if (file.exists) {
    file.delete()
  }

  file.write(base64Data, { encoding: 'base64' })

  return Share.open({
    title: fileName,
    url: file.uri,
    type: mimeType
  })
}
