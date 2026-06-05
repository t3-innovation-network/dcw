import { createNavigationContainerRef } from '@react-navigation/native'
import type { RootNavigationParamsList } from './RootNavigation/RootNavigation.types'

export const navigationRef =
  createNavigationContainerRef<RootNavigationParamsList>()
