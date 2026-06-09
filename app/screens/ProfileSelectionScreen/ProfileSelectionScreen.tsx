import React, { useEffect, useMemo } from 'react'
import { FlatList, Text, View } from 'react-native'
import { Button } from '@rneui/themed'
import { MaterialIcons } from '@expo/vector-icons'

import dynamicStyleSheet from './ProfileSelectionScreen.styles'
import {
  ProfileSelectionScreenProps,
  ProfileButtonProps
} from './ProfileSelectionScreen.types'
import { NavHeader } from '../../components'
import { useSelector } from 'react-redux'
import { selectRawProfileRecords } from '../../store/slices/profile'
import { useDynamicStyles, useSelectorFactory } from '../../hooks'

import { makeSelectProfileForPendingCredentials } from '../../store/selectorFactories/makeSelectProfileForPendingCredentials'

export default function ProfileSelectionScreen({
  navigation,
  route
}: ProfileSelectionScreenProps): React.ReactElement {
  const { styles, mixins } = useDynamicStyles(dynamicStyleSheet)
  const rawProfileRecords = useSelector(selectRawProfileRecords)
  const associatedProfile = useSelectorFactory(
    makeSelectProfileForPendingCredentials
  )

  const {
    onSelectProfile,
    instructionText = 'Please select a profile.',
    goBack = navigation.goBack
  } = route.params || {}

  const flatListData = useMemo(
    () => [...rawProfileRecords],
    [rawProfileRecords]
  )

  useEffect(() => {
    console.log('Profile records:', rawProfileRecords)

    if (associatedProfile) {
      onSelectProfile(associatedProfile)
    } else if (rawProfileRecords.length === 1) {
      onSelectProfile(rawProfileRecords[0])
    }
  }, [associatedProfile, rawProfileRecords, onSelectProfile])

  const ListHeader = (
    <View style={styles.listHeader}>
      <Text style={mixins.paragraphText}>{instructionText}</Text>
    </View>
  )

  return (
    <>
      <NavHeader title="Choose Profile" goBack={goBack} />
      <FlatList
        ListHeaderComponent={ListHeader}
        style={styles.container}
        data={flatListData}
        renderItem={({ item }) => (
          <ProfileButton
            rawProfileRecord={item}
            onPress={() => onSelectProfile(item)}
          />
        )}
      />
    </>
  )
}

function ProfileButton({ rawProfileRecord, onPress }: ProfileButtonProps) {
  const { mixins, theme } = useDynamicStyles()

  return (
    <Button
      title={rawProfileRecord.profileName}
      buttonStyle={mixins.buttonIcon}
      containerStyle={mixins.buttonContainerVertical}
      titleStyle={mixins.buttonIconTitle}
      iconRight
      onPress={onPress}
      icon={
        <MaterialIcons
          name="chevron-right"
          size={theme.iconSize}
          color={theme.color.textSecondary}
        />
      }
    />
  )
}
