import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import App from '../src/App';
import { useAuthStore } from '../src/stores/authStore';
import * as Keychain from 'react-native-keychain';

jest.mock('../src/stores/authStore');
jest.mock('../src/navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

describe('App', () => {
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      initialize: jest.fn(),
      isLoading: false,
      isAuthenticated: false,
    });
  });

  it('renders without crashing', async () => {
    const { getByTestId } = render(<App />);
    
    await waitFor(() => {
      expect(mockUseAuthStore).toHaveBeenCalled();
    });
  });

  it('initializes auth store on mount', async () => {
    const mockInitialize = jest.fn();
    mockUseAuthStore.mockReturnValue({
      initialize: mockInitialize,
      isLoading: false,
      isAuthenticated: false,
    });

    render(<App />);

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
    });
  });

  it('shows splash screen while loading', () => {
    mockUseAuthStore.mockReturnValue({
      initialize: jest.fn(),
      isLoading: true,
      isAuthenticated: false,
    });

    const { getByTestId } = render(<App />);
    
    expect(() => getByTestId('splash-screen')).not.toThrow();
  });

  it('renders navigator when not loading', async () => {
    mockUseAuthStore.mockReturnValue({
      initialize: jest.fn(),
      isLoading: false,
      isAuthenticated: true,
    });

    const { queryByTestId } = render(<App />);
    
    await waitFor(() => {
      expect(queryByTestId('splash-screen')).toBeNull();
    });
  });
});