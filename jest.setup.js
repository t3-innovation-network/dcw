jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true)
}))

// Mock expo-file-system's new File/Paths API so modules that import it resolve
// under jest. This is a benign default; tests that exercise file IO (e.g.
// import.test.ts) provide their own controllable mock.
jest.mock('expo-file-system', () => {
  class File {
    constructor(...uris) {
      this.uri = uris
        .map((u) =>
          u && typeof u === 'object' && 'uri' in u ? u.uri : String(u)
        )
        .join('/')
    }
    get exists() {
      return false
    }
    text() {
      return Promise.resolve('')
    }
    base64() {
      return Promise.resolve('')
    }
    write() {}
    delete() {}
    copy() {}
    move() {}
  }
  return {
    File,
    Paths: {
      document: { uri: 'file:///mock/document' },
      cache: { uri: 'file:///mock/cache' }
    }
  }
})

// Mock expo-print so modules that import it (the PDF export pipeline) resolve
// under jest. `virtual: true` lets the mock register even before `pnpm install`
// has fetched the package. Tests that exercise PDF generation override this.
jest.mock(
  'expo-print',
  () => ({
    printToFileAsync: jest.fn(() =>
      Promise.resolve({ uri: 'file:///mock/print.pdf', numberOfPages: 1 })
    )
  }),
  { virtual: true }
)

// Mock expo-updates so modules that import it (e.g. RestartScreen's app reload)
// resolve under jest. Tests that exercise the reload override this.
jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(() => Promise.resolve())
}))

// Mock expo-sqlite. The model layer is fully jest.mock-ed in component/lib
// tests, so no SQL is ever executed under jest -- this mock only needs to exist
// so that importing model files (which import expo-sqlite) resolves cleanly.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowId: 0 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      withTransactionAsync: jest.fn((cb) => cb()),
      closeAsync: jest.fn().mockResolvedValue(undefined)
    })
  ),
  deleteDatabaseAsync: jest.fn().mockResolvedValue(undefined)
}))

// Mock @react-native-documents/picker
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  keepLocalCopy: jest.fn(),
  types: {
    allFiles: '*/*'
  }
}))

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true)
}))

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(() => Promise.resolve()),
  getInternetCredentials: jest.fn(() =>
    Promise.resolve({ username: 'test', password: 'test' })
  ),
  resetInternetCredentials: jest.fn(() => Promise.resolve()),
  canImplyAuthentication: jest.fn(() => Promise.resolve(true)),
  getSupportedBiometryType: jest.fn(() => Promise.resolve('TouchID')),
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint'
  }
}))

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  return {
    MaterialIcons: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name }),
    Ionicons: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name }),
    AntDesign: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name }),
    Feather: ({ name, size, color, ...props }) =>
      React.createElement('Text', { ...props, children: name })
  }
})

// Mock react-native-outside-press
jest.mock('react-native-outside-press', () => {
  const React = require('react')
  const MockOutsidePressHandler = ({
    children,
    onOutsidePress,
    disabled,
    ...props
  }) => {
    return React.createElement('View', props, children)
  }
  return {
    __esModule: true,
    default: MockOutsidePressHandler
  }
})

// Mock react-native-elements
jest.mock('react-native-elements', () => {
  const React = require('react')
  return {
    Button: ({ title, onPress, ...props }) =>
      React.createElement('Button', { ...props, onPress, children: title }),
    Text: ({ children, ...props }) =>
      React.createElement('Text', props, children)
  }
})

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react')
  return {
    TextInput: ({ value, onChangeText, label, ...props }) =>
      React.createElement('TextInput', {
        ...props,
        value,
        onChangeText,
        testID: label
      })
  }
})

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react')
  return ({ value, size, getRef, ...props }) => {
    React.useImperativeHandle(getRef, () => ({
      toDataURL: (callback) => callback && callback('mock-qr-data')
    }))
    return React.createElement('View', { ...props, testID: 'qr-code' })
  }
})

// Mock @react-native-clipboard/clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve(''))
}))

// Mock react-native-share
jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve())
}))

// Global React Native mock setup
global.mockNativeModules = {
  RNVectorIconsManager: {},
  RNKeychainManager: {
    setInternetCredentials: jest.fn(() => Promise.resolve()),
    getInternetCredentials: jest.fn(() =>
      Promise.resolve({ username: 'test', password: 'test' })
    ),
    resetInternetCredentials: jest.fn(() => Promise.resolve())
  }
}

// Global setup for native modules only
global.NativeModules = global.mockNativeModules

// Mock Redux hooks
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(() => jest.fn()),
  useSelector: jest.fn(),
  Provider: ({ children }) => children
}))

// Mock AccessibleView component specifically
jest.mock(
  '../app/components/AccessibleView/AccessibleView',
  () => {
    const React = require('react')
    const AccessibleView = React.forwardRef(
      ({ children, onPress, label, ...props }, ref) => {
        return React.createElement(
          'View',
          {
            ...props,
            ref,
            onPress,
            accessibilityLabel: label,
            accessible: true
          },
          children
        )
      }
    )
    AccessibleView.displayName = 'AccessibleView'
    return {
      __esModule: true,
      default: AccessibleView
    }
  },
  { virtual: true }
)

// Mock other components that ProfileItem depends on
jest.mock(
  '../app/components/MoreMenuButton/MoreMenuButton',
  () => {
    const React = require('react')
    return ({ children }) =>
      React.createElement('View', { testID: 'more-menu' }, children)
  },
  { virtual: true }
)

jest.mock(
  '../app/components/MenuItem/MenuItem',
  () => {
    const React = require('react')
    return ({ title, onPress }) =>
      React.createElement('View', { onPress, testID: `menu-${title}` }, title)
  },
  { virtual: true }
)

jest.mock(
  '../app/components/ConfirmModal/ConfirmModal',
  () => {
    const React = require('react')
    return ({
      title,
      children,
      onConfirm,
      onCancel,
      onRequestClose,
      cancelButton = true
    }) =>
      React.createElement(
        'View',
        { testID: 'confirm-modal' },
        React.createElement('View', { testID: 'modal-title' }, title),
        React.createElement(
          'View',
          { onPress: onConfirm, testID: 'confirm' },
          'confirm'
        ),
        cancelButton
          ? React.createElement(
              'View',
              { onPress: onCancel || onRequestClose, testID: 'cancel' },
              'cancel'
            )
          : null,
        children
      )
  },
  { virtual: true }
)

jest.mock(
  '../app/components/BackupItemModal/BackupItemModal',
  () => {
    const React = require('react')
    return ({ title, onBackup, onRequestClose }) =>
      React.createElement(
        'View',
        { testID: 'backup-modal' },
        React.createElement(
          'View',
          { testID: 'backup-title' },
          title || 'Backup'
        ),
        React.createElement(
          'View',
          { onPress: onBackup, testID: 'backup-do' },
          'backup'
        ),
        React.createElement(
          'View',
          { onPress: onRequestClose, testID: 'backup-close' },
          'close'
        )
      )
  },
  { virtual: true }
)

// Mock app hooks
jest.mock(
  '../app/hooks/useAppDispatch',
  () => ({
    useAppDispatch: jest.fn(() => jest.fn())
  }),
  { virtual: true }
)

jest.mock(
  '../app/hooks/useDynamicStyles',
  () => ({
    useDynamicStyles: jest.fn(() => ({
      styles: {
        container: {},
        textContainer: {},
        titleText: {},
        subtitleText: {},
        input: {},
        underline: {},
        buttonContainer: {},
        buttonContainerActive: {},
        menuContainer: {}
      },
      theme: {
        color: {
          textPrimary: '#000',
          inputInactive: '#999',
          brightAccent: '#007AFF'
        }
      },
      mixins: {
        modalBodyText: {},
        buttonClear: {},
        buttonClearTitle: {},
        buttonClearContainer: {},
        headerIcon: {},
        shadow: {}
      }
    }))
  }),
  { virtual: true }
)

// Mock store slices
jest.mock(
  '../app/store/slices/profile',
  () => ({
    deleteProfile: jest.fn((payload) => ({ type: 'profile/delete', payload })),
    updateProfile: jest.fn((payload) => ({ type: 'profile/update', payload }))
  }),
  { virtual: true }
)

// Mock lib functions
jest.mock(
  '../app/lib/export',
  () => ({
    exportProfile: jest.fn()
  }),
  { virtual: true }
)

jest.mock(
  '../app/lib/error',
  () => ({
    errorMessageFrom: jest.fn((err) => err.message || 'Unknown error')
  }),
  { virtual: true }
)

jest.mock(
  '../app/lib/text',
  () => ({
    fmtCredentialCount: jest.fn(
      (count) => `${count} credential${count !== 1 ? 's' : ''}`
    )
  }),
  { virtual: true }
)

// Mock navigation
jest.mock(
  '../app/navigation/navigationRef',
  () => ({
    navigationRef: {
      isReady: jest.fn(() => true),
      navigate: jest.fn()
    }
  }),
  { virtual: true }
)
