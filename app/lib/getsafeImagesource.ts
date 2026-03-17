import { ImageSourcePropType } from 'react-native'
import defaultIssuerImage from '../assets/defaultIssuer.png'

export const getSafeImageSource = (
  imageUri?: string | null
): ImageSourcePropType => {
  return imageUri && imageUri.trim() !== ''
    ? { uri: imageUri }
    : defaultIssuerImage
}
