import type { ThemeType } from '..'
import { Color } from '../../colors'
import { FontFamily } from '../../fonts'
import { ColorScheme } from '../../colorScheme'

export const darkTheme: ThemeType = {
  name: 'DarkTheme',
  color: {
    linkColor: Color.DarkCyan,
    backgroundPrimary: Color.BackgroundBlue,
    backgroundSecondary: Color.NavBlue,
    foregroundPrimary: Color.NavBlue,
    textHeader: Color.TitleGreen,
    textPrimary: Color.Gray100,
    brightAccent: Color.LightCyan,
    textSecondary: Color.White,
    textPrimaryDark: Color.Black,
    iconActive: Color.TitleGreen,
    iconInactive: Color.Gray400,
    inputInactive: Color.Gray400,
    buttonPrimary: Color.TitleGreen,
    buttonSecondary: Color.Gray600,
    buttonDisabled: Color.Gray500,
    shadow: Color.Black,
    success: Color.Green,
    error: Color.Red,
    warning: Color.Yellow,
    errorLight: Color.LightRed,
    transparent: Color.Transparent,
    switchActive: Color.DarkCyan,
    modalBackground: Color.Gray900,
    highlightAndroid: Color.TransparentCyan
  },
  fontFamily: {
    regular: FontFamily.RubikRegular,
    medium: FontFamily.RubikMedium,
    bold: FontFamily.RubikBold,
    mono: FontFamily.RobotoMonoRegular
  },
  fontSize: {
    title: 36,
    header: 24,
    medium: 18,
    regular: 16,
    small: 12
  },
  borderRadius: 5,
  iconSize: 24,
  issuerIconSize: 48,
  statusBarStyle: ColorScheme.Light,
  keyboardAppearance: ColorScheme.Dark,
  shadowOpacity: 0.15
}
