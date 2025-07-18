/*
                        Semantest - Error Boundary Tests
                        Tests for React error boundary component

    This file is part of Semantest.

    Semantest is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from './error-boundary';
import { SemantestError } from './base.error';
import { ImageSearchError } from './google-images.error';

// Mock error handler
const mockErrorHandler = {
  handle: jest.fn().mockReturnValue({
    error: {
      message: 'Test error',
      code: 'TEST_ERROR',
      correlationId: 'test-123'
    }
  })
};

jest.mock('./error-handler', () => ({
  globalErrorHandler: mockErrorHandler
}));

// Test components
const ThrowingComponent: React.FC<{ shouldThrow?: boolean; errorType?: 'generic' | 'semantest' }> = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}) => {
  if (shouldThrow) {
    if (errorType === 'semantest') {
      throw new ImageSearchError('test query', 'Test error for boundary');
    } else {
      throw new Error('Test error');
    }
  }
  return <div>Working component</div>;
};

const CustomFallbackComponent: React.FC<{ error: Error; errorInfo: any }> = ({ error, errorInfo }) => (
  <div>
    <h2>Custom Error Fallback</h2>
    <p>Error: {error.message}</p>
    <p>Component Stack: {errorInfo.componentStack}</p>
  </div>
);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('Basic Error Handling', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should catch and display generic errors', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('should catch and display Semantest errors', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="semantest" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/Test error for boundary/)).toBeInTheDocument();
    });
  });

  describe('Custom Fallback Component', () => {
    it('should render custom fallback component', () => {
      render(
        <ErrorBoundary fallback={CustomFallbackComponent}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument();
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });

    it('should render fallback function result', () => {
      const fallbackFn = (error: Error, errorInfo: any) => (
        <div>
          <h3>Function Fallback</h3>
          <p>Error Code: {error.name}</p>
        </div>
      );

      render(
        <ErrorBoundary fallback={fallbackFn}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Function Fallback')).toBeInTheDocument();
      expect(screen.getByText('Error Code: Error')).toBeInTheDocument();
    });
  });

  describe('Error Handling Callbacks', () => {
    it('should call onError callback when error occurs', () => {
      const onErrorCallback = jest.fn();

      render(
        <ErrorBoundary onError={onErrorCallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorCallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should integrate with global error handler', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="semantest" />
        </ErrorBoundary>
      );

      expect(mockErrorHandler.handle).toHaveBeenCalledWith(
        expect.any(ImageSearchError)
      );
    });
  });

  describe('Error Level Classification', () => {
    it('should handle page-level errors', () => {
      render(
        <ErrorBoundary level="page">
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(screen.getByText(/The page encountered an error/)).toBeInTheDocument();
    });

    it('should handle component-level errors', () => {
      render(
        <ErrorBoundary level="component">
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
      expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument();
    });

    it('should handle application-level errors', () => {
      render(
        <ErrorBoundary level="application">
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText(/The application encountered a critical error/)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should provide retry functionality', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      
      // Simulate successful retry
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should reset error state on retry', () => {
      const TestWrapper = ({ shouldThrow }: { shouldThrow: boolean }) => (
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      const { rerender } = render(<TestWrapper shouldThrow={true} />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      rerender(<TestWrapper shouldThrow={false} />);
      
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });

  describe('Error Boundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowingComponent, {
        level: 'component',
        fallback: CustomFallbackComponent
      });

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Custom Error Fallback')).toBeInTheDocument();
    });

    it('should pass props to wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowingComponent, {
        level: 'component'
      });

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should use custom options in HOC', () => {
      const customOnError = jest.fn();
      const WrappedComponent = withErrorBoundary(ThrowingComponent, {
        level: 'page',
        onError: customOnError
      });

      render(<WrappedComponent shouldThrow={true} />);

      expect(customOnError).toHaveBeenCalled();
      expect(screen.getByText('Page Error')).toBeInTheDocument();
    });
  });

  describe('useErrorHandler Hook', () => {
    const HookTestComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
      const handleError = useErrorHandler();

      const handleClick = () => {
        try {
          if (shouldThrow) {
            throw new ImageSearchError('test', 'Hook test error');
          }
        } catch (error) {
          handleError(error);
        }
      };

      return (
        <div>
          <button onClick={handleClick}>Test Hook</button>
          <div>Hook test component</div>
        </div>
      );
    };

    it('should handle errors using hook', () => {
      render(
        <ErrorBoundary>
          <HookTestComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByText('Test Hook');
      button.click();

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should not throw when no error boundary exists', () => {
      const handleError = useErrorHandler();
      
      expect(() => {
        handleError(new Error('Test error'));
      }).not.toThrow();
    });
  });

  describe('Error Information', () => {
    it('should include component stack in error info', () => {
      const onErrorCallback = jest.fn();

      render(
        <ErrorBoundary onError={onErrorCallback}>
          <div>
            <div>
              <ThrowingComponent shouldThrow={true} />
            </div>
          </div>
        </ErrorBoundary>
      );

      expect(onErrorCallback).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.stringContaining('ThrowingComponent')
        })
      );
    });

    it('should provide error boundary information', () => {
      const fallbackFn = (error: Error, errorInfo: any) => (
        <div>
          <p>Error: {error.message}</p>
          <p>Stack: {errorInfo.componentStack}</p>
        </div>
      );

      render(
        <ErrorBoundary fallback={fallbackFn}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
      expect(screen.getByText(/Stack:/)).toBeInTheDocument();
    });
  });

  describe('Multiple Error Boundaries', () => {
    it('should handle nested error boundaries', () => {
      render(
        <ErrorBoundary level="application">
          <div>
            <ErrorBoundary level="page">
              <div>
                <ErrorBoundary level="component">
                  <ThrowingComponent shouldThrow={true} />
                </ErrorBoundary>
              </div>
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Should be caught by innermost boundary
      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });

    it('should bubble up if inner boundary fails', () => {
      const FailingFallback: React.FC = () => {
        throw new Error('Fallback failed');
      };

      render(
        <ErrorBoundary level="application">
          <ErrorBoundary level="component" fallback={FailingFallback}>
            <ThrowingComponent shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Should be caught by outer boundary
      expect(screen.getByText('Application Error')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not impact performance when no errors occur', () => {
      const startTime = performance.now();
      
      render(
        <ErrorBoundary>
          <div>
            {Array.from({ length: 100 }, (_, i) => (
              <ThrowingComponent key={i} shouldThrow={false} />
            ))}
          </div>
        </ErrorBoundary>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly (under 100ms for 100 components)
      expect(renderTime).toBeLessThan(100);
    });
  });
});