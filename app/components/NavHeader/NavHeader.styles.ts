import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  titleLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
    resizeMode: 'contain'
  }
}))
