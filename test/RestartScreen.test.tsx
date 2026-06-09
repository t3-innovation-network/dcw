import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import * as Updates from 'expo-updates'

import RestartScreen from '../app/screens/RestartScreen/RestartScreen'

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn()
}))

jest.mock('../app/hooks', () => ({
  useDynamicStyles: () => ({
    styles: new Proxy({}, { get: () => ({}) }),
    theme: {},
    mixins: {}
  })
}))

// SafeScreenView pulls in the keyboard-aware scroll view / safe-area context;
// a passthrough keeps this test focused on the restart behavior.
jest.mock('../app/components', () => {
  const mockReact = require('react')
  return {
    SafeScreenView: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement(mockReact.Fragment, null, children)
  }
})

jest.mock('../app.config', () => ({
  __esModule: true,
  default: { displayName: 'Test Wallet' }
}))

// Render the button's title inside a <Text> within a Pressable so it is both
// queryable by text and pressable.
jest.mock('@rneui/themed', () => {
  const mockReact = require('react')
  const { Text, Pressable } = require('react-native')
  return {
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      mockReact.createElement(
        Pressable,
        { onPress, accessibilityRole: 'button' },
        mockReact.createElement(Text, null, title)
      )
  }
})

describe('RestartScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reloads the app when "Restart Now" is pressed', () => {
    ;(Updates.reloadAsync as jest.Mock).mockResolvedValueOnce(undefined)

    const { getByText } = render(<RestartScreen />)
    fireEvent.press(getByText('Restart Now'))

    expect(Updates.reloadAsync).toHaveBeenCalledTimes(1)
  })

  it('shows a manual-restart fallback when the reload fails', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    ;(Updates.reloadAsync as jest.Mock).mockRejectedValueOnce(
      new Error('cannot reload in dev')
    )

    const { getByText, findByText } = render(<RestartScreen />)
    fireEvent.press(getByText('Restart Now'))

    // The paragraph swaps to the manual instructions once the reload rejects.
    await findByText(/close the application, then re-open it/i)

    consoleError.mockRestore()
  })
})
