import { createDynamicStyleSheet } from '../../lib/dynamicStyles'
import { Color } from '../../styles/colors'

export default createDynamicStyleSheet(({ mixins, theme }) => ({
  container: {
    padding: 16,
    flex: 1
  },
  paragraph: {
    ...mixins.paragraphText,
    marginBottom: 16,
    marginTop: 8
  },
  shareButton: {
    ...mixins.buttonPrimary
  },
  sectionContainer: {
    marginVertical: 4
  },
  header: {
    ...mixins.headerText,
    fontSize: theme.fontSize.regular,
    marginBottom: 6
  },
  input: {
    ...mixins.input,
    flex: 1,
    height: 360,
    minHeight: 360,
    backgroundColor: theme.color.backgroundPrimary
  },
  inputContent: {
    color: theme.color.textSecondary,
    textAlignVertical: 'top'
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  inputLabel: {
    color: theme.color.textSecondary,
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.medium
  },
  sampleLink: {
    color: theme.color.buttonPrimary,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.fontSize.regular,
    textDecorationLine: 'underline'
  },
  textAreaContainer: {
    flex: 1
  },
  actionButton: {
    paddingHorizontal: 16
  },
  actionButtonInactive: {
    backgroundColor: Color.BrightGreen,
    opacity: 0.5
  },
  actionButtonInactiveTitle: {
    color: Color.DarkBlue
  },
  actionButtonContainer: {
    bottom: 8,
    right: 8,
    position: 'absolute'
  },
  actionInputContainer: {
    flexDirection: 'row',
    position: 'relative',
    paddingTop: 8
  }
}))
