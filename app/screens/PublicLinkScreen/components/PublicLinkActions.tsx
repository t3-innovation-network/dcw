import React from 'react'
import { View } from 'react-native'
import { Button } from '@rneui/themed'
import { MaterialIcons } from '@expo/vector-icons'

import { useDynamicStyles } from '../../../hooks'
import dynamicStyleSheet from '../PublicLinkScreen.styles'

export type PublicLinkActionsProps = {
  onUnshare: () => void
  onViewLink: () => void
}

/** The "Unshare" / "View Link" action row shown when a link exists. */
export default function PublicLinkActions({
  onUnshare,
  onViewLink
}: PublicLinkActionsProps): React.ReactElement {
  const { styles, mixins, theme } = useDynamicStyles(dynamicStyleSheet)

  return (
    <View style={styles.actions}>
      <Button
        title="Unshare"
        buttonStyle={{
          ...mixins.buttonIcon,
          ...styles.actionButton
        }}
        containerStyle={{ ...mixins.buttonContainer }}
        titleStyle={mixins.buttonIconTitle}
        onPress={onUnshare}
        testID="unshare-button"
        icon={
          <MaterialIcons
            style={styles.actionIcon}
            name="link-off"
            size={theme.iconSize}
            color={theme.color.iconInactive}
          />
        }
      />
      <View style={styles.spacer} />
      <Button
        title="View Link"
        buttonStyle={{
          ...mixins.buttonIcon,
          ...styles.actionButton
        }}
        containerStyle={mixins.buttonContainer}
        titleStyle={mixins.buttonIconTitle}
        onPress={onViewLink}
        testID="view-link-button"
        icon={
          <MaterialIcons
            style={styles.actionIcon}
            name="launch"
            size={theme.iconSize}
            color={theme.color.iconInactive}
          />
        }
      />
    </View>
  )
}
