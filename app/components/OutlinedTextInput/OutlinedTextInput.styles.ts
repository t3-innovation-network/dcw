import { StyleSheet } from 'react-native'
import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  container: {
    borderWidth: 1,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 8,
    minHeight: 48,
    justifyContent: 'center'
  },
  input: {
    paddingHorizontal: 4,
    paddingVertical: 0,
    margin: 0,
    fontSize: theme.fontSize.regular,
    fontFamily: theme.fontFamily.verdana
  },
  placeholderWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  placeholderText: {
    fontSize: theme.fontSize.regular,
    fontFamily: theme.fontFamily.verdana
  },
  labelFloating: {
    position: 'absolute',
    top: -8,
    left: 8,
    paddingHorizontal: 4,
    fontSize: 12,
    fontFamily: theme.fontFamily.verdana
  }
}))
