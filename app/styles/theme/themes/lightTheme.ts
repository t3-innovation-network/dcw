import type { ThemeType } from '..'
import { Color } from '../../colors'
import { FontFamily } from '../../fonts'
import { ColorScheme } from '../../colorScheme'

export const lightTheme: ThemeType = {
  name: 'LightTheme',
  color: {
    linkColor: Color.Blue,
    backgroundPrimary: Color.BackgroundBlue,
    backgroundSecondary: Color.NavBlue,
    foregroundPrimary: Color.NavBlue,
    textHeader: Color.TitleGreen,
    textPrimary: Color.Gray300,
    brightAccent: Color.Blue,
    textSecondary: Color.White,
    textPrimaryDark: Color.White,
    iconActive: Color.TitleGreen,
    iconInactive: Color.Gray500,
    inputInactive: Color.Gray600,
    buttonPrimary: Color.BrightGreen,
    buttonSecondary: Color.BlueGray,
    buttonDisabled: Color.Gray500,
    shadow: Color.Black,
    success: Color.DarkGreen,
    error: Color.Red,
    warning: Color.Yellow,
    errorLight: Color.DarkRed,
    transparent: Color.Transparent,
    switchActive: Color.Blue,
    modalBackground: Color.Gray400,
    highlightAndroid: Color.TransparentBlue
  },
  fontFamily: {
    TobiasLight: FontFamily.TobiasLight,
    lighter: FontFamily.GT_AmericaLighter,
    regular: FontFamily.GT_AmericaRegular,
    medium: FontFamily.GT_AmericaMedium,
    bold: FontFamily.GT_AmericaBold,
    mono: FontFamily.RobotoMonoRegular,
    verdana: FontFamily.Verdana
  },
  fontSize: {
    xl: 48,
    title: 36,
    header: 24,
    medium: 20,
    regular: 18,
    small: 14
  },
  borderRadius: 0,
  iconSize: 24,
  issuerIconSize: 48,
  statusBarStyle: ColorScheme.Dark,
  keyboardAppearance: ColorScheme.Light,
  shadowOpacity: 0.1
}
