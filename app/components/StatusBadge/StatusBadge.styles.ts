import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  container: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    marginHorizontal: 2,
    height: 24,
    marginBottom: 4
  },
  icon: {
    marginRight: 4,
    marginLeft: -10,
    fontSize: theme.fontSize.medium
  },
  label: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.fontSize.regular
  }
}))
