// Mock implementation of useSemantest hook for testing

export const useSemantest = jest.fn(() => ({
  client: null,
  connected: false
}));