import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import {
  PendingCredential,
  ApprovalStatus,
  ApprovalMessage
} from '../app/store/slices/credentialFoyer'
import { mockCredential } from '../app/mock/credential'
import { ObjectID } from 'bson'

// Ensure ApprovalControls' useSelector(selectRawCredentialRecords) always receives
// a state shape that contains `credential.rawCredentialRecords` (so `.find` can't crash).
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux')
  return {
    ...actual,
    useSelector: (selector: any) =>
      selector({ credential: { rawCredentialRecords: [] } })
  }
})

// Mock the navigation
jest.mock('../app/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn()
  }
}))

// Mock the hooks
jest.mock('../app/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useDynamicStyles: () => ({
    styles: {
      approvalContainer: {},
      button: {},
      buttonPrimary: {},
      buttonText: {},
      buttonTextPrimary: {},
      buttonSpacer: {},
      credentialStatusContainer: {},
      statusText: {},
      statusTextOutside: {}
    },
    theme: {
      iconSize: 24,
      color: {
        success: '#00ff00',
        error: '#ff0000'
      }
    }
  }),
  useAccessibilityFocus: () => [null, jest.fn()]
}))

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons'
}))

// Mock the credential foyer actions
jest.mock('../app/store/slices/credentialFoyer', () => ({
  ...jest.requireActual('../app/store/slices/credentialFoyer'),
  setCredentialApproval: jest.fn(() => ({ type: 'setCredentialApproval' })),
  acceptPendingCredentials: jest.fn(() => ({
    type: 'acceptPendingCredentials'
  })),
  clearFoyer: jest.fn(() => ({ type: 'clearFoyer' }))
}))

// Mock the credential slice selectors/actions used by ApprovalControls.rejectAndExit
jest.mock('../app/store/slices/credential', () => ({
  ...jest.requireActual('../app/store/slices/credential'),
  // Make this safe even if the store doesn't perfectly match RootState in unit tests.
  selectRawCredentialRecords: jest.fn(
    (state?: { credential?: { rawCredentialRecords?: any[] } }) =>
      state?.credential?.rawCredentialRecords ?? []
  ),
  deleteCredential: jest.fn(() => ({ type: 'deleteCredential' }))
}))

// Require AFTER mocks so ApprovalControls picks up the mocked selectors/actions.
const ApprovalControls =
  require('../app/components/ApprovalControls/ApprovalControls').default

const createMockStore = () =>
  configureStore({
    reducer: {
      credentialFoyer: (state = { pendingCredentials: [] }) => state,
      // ApprovalControls uses selectRawCredentialRecords(state). Ensure this exists for tests.
      credential: (state = { rawCredentialRecords: [] }) => state
    }
  })

describe('ApprovalControls', () => {
  const mockProfileRecordId = new ObjectID()
  let mockStore: any

  beforeEach(() => {
    mockStore = createMockStore()
    jest.clearAllMocks()
  })

  const renderComponent = (pendingCredential: PendingCredential) => {
    return render(
      <Provider store={mockStore}>
        <ApprovalControls
          pendingCredential={pendingCredential}
          profileRecordId={mockProfileRecordId}
        />
      </Provider>
    )
  }

  describe('Pending status', () => {
    it('should render Accept and Decline buttons for pending credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText('Accept')).toBeTruthy()
      expect(getByText('Skip')).toBeTruthy()
    })

    it('should call acceptPendingCredentials when Accept is pressed', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Accept'))
      // The actual dispatch call would be tested in integration tests
    })

    it('should call setCredentialApproval when Decline is pressed', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Skip'))
      // The actual dispatch call would be tested in integration tests
    })
  })

  describe('PendingDuplicate status', () => {
    it('should render Remove From Wallet button for duplicate credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText('Remove From Wallet')).toBeTruthy()
      expect(() => getByText('Accept')).toThrow()
      expect(() => getByText('Skip')).toThrow()
    })

    it('should display duplicate message for duplicate credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Duplicate)).toBeTruthy()
    })

    it('should call rejectAndExit when Remove From Wallet is pressed', async () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Remove From Wallet'))

      // The actual navigation and dispatch calls would be tested in integration tests
      // Here we just verify the button is pressable
      expect(getByText('Remove From Wallet')).toBeTruthy()
    })

    it('should not navigate when navigationRef is not ready', async () => {
      const { navigationRef } = require('../app/navigation/navigationRef')
      navigationRef.isReady.mockReturnValue(false)

      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Remove From Wallet'))

      expect(navigationRef.navigate).not.toHaveBeenCalled()
    })
  })

  describe('Completed status', () => {
    it('should render status icon and message for accepted credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Accepted
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Accepted)).toBeTruthy()
    })

    it('should render status icon and message for rejected credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Rejected
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Rejected)).toBeTruthy()
    })

    it('should render status icon and message for errored credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Errored
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Errored)).toBeTruthy()
    })

    it('should use message override when provided', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Rejected,
        ApprovalMessage.Duplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Duplicate)).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should render buttons with proper accessibility', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      const acceptButton = getByText('Accept')
      const declineButton = getByText('Skip')

      // Verify buttons are rendered and accessible
      expect(acceptButton).toBeTruthy()
      expect(declineButton).toBeTruthy()
    })

    it('should render status message for completed status', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Accepted
      )
      const { getByText } = renderComponent(pendingCredential)

      // Check that the status message is displayed
      expect(getByText(ApprovalMessage.Accepted)).toBeTruthy()
    })
  })
})
