import React, { forwardRef, Ref, useState } from 'react'
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native'

import { useDynamicStyles } from '../../hooks'
import dynamicStyleSheet from './OutlinedTextInput.styles'

export type OutlinedTextInputColors = {
  /** Label / placeholder text color. */
  placeholder?: string
  /** Input text color. */
  text?: string
  /** Outline and label color when the field is focused. */
  primary?: string
}

export type OutlinedTextInputProps = TextInputProps & {
  /** Floating label shown in the outline (acts as placeholder while empty). */
  label?: string
  /** Border color while the field is not focused. */
  outlineColor?: string
  /** Color overrides for the label, input text, and focused outline. */
  colors?: OutlinedTextInputColors
}

/**
 * An outlined text field with a floating label, replacing the single
 * `react-native-paper` `<TextInput mode="outlined">` usage the wallet had.
 * The label sits as a placeholder while the field is empty and unfocused, and
 * floats up into the top border (notched via the field background) otherwise.
 */
function OutlinedTextInput(
  {
    label,
    outlineColor,
    colors,
    style,
    value,
    onFocus,
    onBlur,
    ...rest
  }: OutlinedTextInputProps,
  ref: Ref<TextInput>
): React.ReactElement {
  const { styles, theme } = useDynamicStyles(dynamicStyleSheet)
  const [focused, setFocused] = useState(false)

  const textColor = colors?.text ?? theme.color.textPrimary
  const labelColor = colors?.placeholder ?? theme.color.inputInactive
  const activeColor = colors?.primary ?? theme.color.brightAccent
  const borderColor = focused
    ? activeColor
    : (outlineColor ?? theme.color.textPrimary)

  const flatStyle = StyleSheet.flatten(style) ?? {}
  const backgroundColor =
    flatStyle.backgroundColor ?? theme.color.backgroundPrimary
  const hasValue = value != null && String(value).length > 0
  const floatLabel = focused || hasValue

  return (
    <View style={[styles.container, { borderColor, backgroundColor }]}>
      <TextInput
        ref={ref}
        value={value}
        style={[
          styles.input,
          { color: textColor },
          style,
          { backgroundColor: 'transparent' }
        ]}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...rest}
      />
      {label != null &&
        (floatLabel ? (
          <Text
            pointerEvents="none"
            numberOfLines={1}
            style={[
              styles.labelFloating,
              { color: activeColor, backgroundColor }
            ]}
          >
            {label}
          </Text>
        ) : (
          <View pointerEvents="none" style={styles.placeholderWrap}>
            <Text
              numberOfLines={1}
              style={[styles.placeholderText, { color: labelColor }]}
            >
              {label}
            </Text>
          </View>
        ))}
    </View>
  )
}

export default forwardRef<TextInput, OutlinedTextInputProps>(OutlinedTextInput)
