import React from 'react'
import { View, TextInput as RNTextInput } from 'react-native'
import { Button } from 'react-native-elements'
import { TextInput } from 'react-native-paper'
import OutsidePressHandler from 'react-native-outside-press'

import { useDynamicStyles } from '../../../hooks'
import dynamicStyleSheet from '../PublicLinkScreen.styles'

type Selection = { start: number; end: number } | undefined

export type PublicLinkFieldProps = {
  publicLink: string
  inputRef: React.RefObject<RNTextInput | null>
  selection: Selection
  selectionColor: string | undefined
  disableOutsidePressHandler: boolean
  onFocusInput: () => void
  blurInput: () => void
  onSelectionChange: (selection: { start: number; end: number }) => void
  copyToClipboard: () => void
}

/** The read-only, copy-able public link field plus its Copy button. */
export default function PublicLinkField({
  publicLink,
  inputRef,
  selection,
  selectionColor,
  disableOutsidePressHandler,
  onFocusInput,
  blurInput,
  onSelectionChange,
  copyToClipboard
}: PublicLinkFieldProps): React.ReactElement {
  const { styles, mixins, theme } = useDynamicStyles(dynamicStyleSheet)

  return (
    <View style={styles.link}>
      <OutsidePressHandler
        style={mixins.flex}
        onOutsidePress={blurInput}
        disabled={disableOutsidePressHandler}
      >
        <TextInput
          ref={inputRef}
          style={{ ...mixins.input, ...styles.linkText }}
          value={publicLink}
          selectionColor={selectionColor}
          theme={{
            colors: {
              placeholder: theme.color.textPrimary,
              text: theme.color.textPrimary,
              disabled: theme.color.textPrimary,
              primary: theme.color.brightAccent
            }
          }}
          autoCorrect={false}
          spellCheck={false}
          mode="outlined"
          onFocus={onFocusInput}
          showSoftInputOnFocus={false}
          onTextInput={() => {}}
          selection={selection}
          onSelectionChange={(e) => onSelectionChange(e.nativeEvent.selection)}
          tvParallaxProperties={{}} // <-- add back to satisfy TS types
        />
      </OutsidePressHandler>

      <Button
        title="Copy"
        buttonStyle={{
          ...mixins.buttonPrimary,
          ...styles.copyButton
        }}
        containerStyle={{
          ...mixins.buttonContainer,
          ...styles.copyButtonContainer
        }}
        titleStyle={mixins.buttonTitle}
        onPress={copyToClipboard}
        testID="copy-link-button"
      />
    </View>
  )
}
