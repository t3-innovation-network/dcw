import { Color } from '../../styles'
import { createDynamicStyleSheet } from '../../lib/dynamicStyles'

export default createDynamicStyleSheet(({ theme, mixins }) => ({
  outerContainer: {
    flex: 1
  },
  scrollContainer: {
    flexGrow: 1
  },
  container: {
    padding: 16
  },

  paper: {
    backgroundColor: Color.White,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.iconInactive
  },

  headerRow: {
    flexDirection: 'row'
  },
  headerLeft: {
    flex: 1,
    padding: 16,
    backgroundColor: Color.Gray100
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10
  },
  nameText: {
    fontFamily: theme.fontFamily.Inter_700Bold,
    fontSize: theme.fontSize.title,
    color: theme.color.textPrimaryDark,
    flexShrink: 1
  },
  locationText: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: Color.Gray600,
    marginTop: 2
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.color.iconInactive,
    borderRadius: 999,
    backgroundColor: Color.White,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  statusPillText: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.fontSize.small,
    color: theme.color.textPrimary
  },
  statusIcon: {
    marginRight: 6
  },

  contactBlock: {
    marginTop: 10
  },
  contactLink: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: theme.color.linkColor,
    textDecorationLine: 'underline'
  },
  socialRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  socialSeparator: {
    color: Color.Gray500,
    marginHorizontal: 10
  },
  socialIcon: {
    marginRight: 6
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sectionTitle: {
    ...mixins.headerText,
    color: Color.Black,
    fontSize: theme.fontSize.medium,
    marginBottom: 8
  },
  bodyText: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    lineHeight: 24,
    color: Color.Black
  },

  item: {
    marginBottom: 14
  },
  itemTitle: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.fontSize.regular,
    color: Color.Black
  },
  itemSub: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.regular,
    color: Color.Black,
    marginTop: 2
  },
  itemMeta: {
    fontFamily: theme.fontFamily.regular,
    fontSize: theme.fontSize.small,
    color: theme.color.iconInactive,
    marginTop: 2
  },

  divider: {
    height: 1,
    backgroundColor: theme.color.iconInactive,
    opacity: 0.5,
    marginTop: 16
  },

  footerSpacer: {
    height: 16
  }
}))
