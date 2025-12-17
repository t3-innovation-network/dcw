import React, { useEffect } from 'react'
import { Image, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { Header } from 'react-native-elements'

import { useAccessibilityFocus, useDynamicStyles } from '../../hooks'
import type { NavHeaderProps } from './NavHeader.d'
import AccessibleView from '../AccessibleView/AccessibleView'
import dynamicStyleSheet from './NavHeader.styles'
import titleLogo from '../../assets/TitleLogo.png'

export default function NavHeader({
  title,
  goBack,
  ...headerProps
}: NavHeaderProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)
  const [headerRef, focusHeader] = useAccessibilityFocus<Text>()

  useEffect(focusHeader, [])

  const leftComponent = goBack ? (
    <AccessibleView label="Back" accessibilityRole="button" onPress={goBack}>
      <MaterialIcons name="arrow-back" style={mixins.headerIcon} />
    </AccessibleView>
  ) : undefined

  const centerComponent = (
    <View style={styles.titleContainer}>
      <Image source={titleLogo} style={styles.titleLogo} />
      <Text
        style={mixins.headerTitle}
        accessibilityLabel={`${title} Screen`}
        ref={headerRef}
      >
        {title}
      </Text>
    </View>
  )

  return (
    <Header
      leftContainerStyle={mixins.headerComponentContainer}
      centerContainerStyle={mixins.headerComponentContainer}
      rightContainerStyle={mixins.headerComponentContainer}
      containerStyle={mixins.headerContainer}
      leftComponent={leftComponent}
      centerComponent={centerComponent}
      {...headerProps}
    />
  )
}
