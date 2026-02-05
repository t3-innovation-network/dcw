import React from 'react'
import { Linking, Text } from 'react-native'
import { useDynamicStyles } from '../../../../hooks'
import { createDynamicStyleSheet } from '../../../dynamicStyles'

type CardLinkProps = {
  url: string | null
  label?: string | null
  disabled?: boolean
}

export default function CardLink({
  url,
  label,
  disabled = false
}: CardLinkProps): React.ReactElement | null {
  const { styles } = useDynamicStyles(dynamicStyleSheet)

  if (!url) return null
  const displayText = String(label ?? url).trim() || url

  return (
    <Text
      style={disabled ? styles.disabledLink : styles.link}
      accessibilityRole={disabled ? undefined : 'link'}
      onPress={disabled ? undefined : () => Linking.openURL(url)}
    >
      {displayText}
    </Text>
  )
}

const dynamicStyleSheet = createDynamicStyleSheet(({ theme }) => ({
  link: {
    fontFamily: theme.fontFamily.regular,
    color: theme.color.linkColor,
    textDecorationLine: 'underline'
  },
  disabledLink: {
    fontFamily: theme.fontFamily.regular,
    color: theme.color.textSecondary,
    textDecorationLine: 'none'
  }
}))
