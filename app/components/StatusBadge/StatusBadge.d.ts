import { MaterialIcons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { Color } from '../../styles'

export type StatusBadgeProps = {
  label: string
  icon?: React.ComponentProps<typeof MaterialIcons>['name']
  iconElement?: ReactNode
  color: Color
}
