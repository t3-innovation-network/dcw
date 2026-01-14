import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme }) => ({
  container: {
    flex: 1,
    backgroundColor: theme.color.backgroundPrimary,
    position: 'relative'
  },
  scrollView: {
    flex: 1
  },
  contentContainer: {
    flexGrow: 1
  },
  screen: {
    flex: 1
  },
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 220,
    resizeMode: 'cover',
    opacity: 0.1
  }
}))
