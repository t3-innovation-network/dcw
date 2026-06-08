import React from 'react'
import { KeyboardAvoidingView, ScrollView, Text } from 'react-native'
import { render } from '@testing-library/react-native'

import SafeScreenView from '../app/components/SafeScreenView/SafeScreenView'

jest.mock('../app/hooks', () => ({
  useDynamicStyles: () => ({
    styles: new Proxy({}, { get: () => ({}) }),
    theme: {},
    mixins: {}
  })
}))

// Passthrough SafeAreaView so the test does not need a SafeAreaProvider.
jest.mock('react-native-safe-area-context', () => {
  const mockReact = require('react')
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) =>
      mockReact.createElement(mockReact.Fragment, null, children)
  }
})

describe('SafeScreenView', () => {
  it('renders its children inside a keyboard-aware scroll view', () => {
    const { getByText, UNSAFE_getByType } = render(
      <SafeScreenView>
        <Text>Hello wallet</Text>
      </SafeScreenView>
    )

    expect(getByText('Hello wallet')).toBeTruthy()

    // Children are wrapped in a ScrollView (so long screens scroll) nested in a
    // KeyboardAvoidingView (so inputs stay reachable above the keyboard).
    expect(UNSAFE_getByType(ScrollView)).toBeTruthy()
    expect(UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy()
  })
})
