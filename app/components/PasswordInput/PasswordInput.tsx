import React, {
  ComponentProps,
  forwardRef,
  Ref,
  useRef,
  RefObject
} from 'react'
import { View, TextInput as RNTextInput, Platform } from 'react-native'
import OutlinedTextInput from '../OutlinedTextInput/OutlinedTextInput'

import AccessibleView from '../AccessibleView/AccessibleView'
import { useDynamicStyles } from '../../hooks'

import dynamicStyleSheet from './PasswordInput.styles'

type TextInputProps = ComponentProps<typeof OutlinedTextInput>

export type PasswordInputProps = TextInputProps & {
  label: string
  value: string
  onChangeText: (value: string) => void
  highlightError?: boolean
  inputRef?: RefObject<RNTextInput | null>
  testID?: string
}

function PasswordInput(
  {
    label,
    value,
    onChangeText,
    inputRef,
    highlightError,
    testID,
    ...textInputProps
  }: PasswordInputProps,
  ref: Ref<View>
): React.ReactElement {
  const { styles, mixins, theme } = useDynamicStyles(dynamicStyleSheet)
  const _inputRef = inputRef || useRef<RNTextInput>(null)
  const selectionColor = Platform.select({
    ios: theme.color.brightAccent,
    android: theme.color.highlightAndroid
  })

  return (
    <AccessibleView
      ref={ref}
      style={styles.container}
      label={`${label}, Input${value && `, containing ${value.length} characters`}`}
      onPress={() => _inputRef.current?.focus()}
      testID={testID}
    >
      <OutlinedTextInput
        ref={_inputRef}
        style={mixins.input}
        autoComplete="off"
        textContentType="newPassword"
        passwordRules="minlength: 10;"
        secureTextEntry
        autoCorrect={false}
        value={value}
        outlineColor={
          highlightError ? theme.color.error : theme.color.textPrimary
        }
        selectionColor={selectionColor}
        colors={{
          placeholder: value
            ? theme.color.textPrimary
            : theme.color.inputInactive,
          text: theme.color.textPrimary,
          primary: theme.color.brightAccent
        }}
        label={label}
        onChangeText={onChangeText}
        keyboardAppearance="dark"
        {...textInputProps}
      />
    </AccessibleView>
  )
}

export default forwardRef<View, PasswordInputProps>(PasswordInput)
