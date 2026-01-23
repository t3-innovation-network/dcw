import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ mixins }) => ({
  container: {
    padding: 16,
    paddingBottom: 0,
    flex: 1
  },
  credentialList: {
    overflow: 'hidden'
  },
  paragraph: {
    ...mixins.paragraphText,
    marginBottom: 16,
    marginTop: 8
  },
  actionRow: {
    margin: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16
  },
  actionColumn: {
    flex: 1
  },
  shareButton: {
    ...mixins.buttonPrimary
  },
  cancelButton: {
    ...mixins.buttonSecondary
  }
}))
