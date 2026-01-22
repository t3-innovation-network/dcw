import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  listItemContainer: {
    ...mixins.button,
    backgroundColor: theme.color.foregroundPrimary,
    paddingVertical: mixins.button.paddingVertical,
    paddingHorizontal: mixins.button.paddingHorizontal,
    minHeight: 72
  },
  listItemOuterContainer: {
    marginVertical: 8
    // borderRadius: mixins.button.borderRadius
  },
  listItemContentContainer: {
    flexDirection: 'column'
  },
  listItemTextContainer: {
    flex: 1
  },
  listItemTopContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  listItemTitle: {
    color: theme.color.textPrimary,
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.fontSize.medium,
    marginBottom: 6
  },
  listItemSubtitle: {
    color: theme.color.textSecondary,
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular
  },
  notVerifiedIcon: {
    width: theme.issuerIconSize,
    height: theme.issuerIconSize,
    marginRight: 16
  },
  verifiedStatusIcon: {
    width: theme.issuerIconSize - 2,
    height: theme.issuerIconSize - 2,
    resizeMode: 'contain'
  },
  checkboxContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.color.textSecondary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxBoxSelected: {
    borderColor: theme.color.buttonPrimary,
    backgroundColor: theme.color.buttonPrimary
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.color.textSecondary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioOuterSelected: {
    borderColor: theme.color.buttonPrimary,
    backgroundColor: 'transparent'
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.color.buttonPrimary
  }
}))
