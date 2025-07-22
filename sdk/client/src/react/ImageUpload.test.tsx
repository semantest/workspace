import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageUpload } from './ImageUpload';
import { ImageEventTypes } from '@semantest/contracts';

// Mock the useSemantest hook
const mockClient = {
  emit: jest.fn().mockResolvedValue(undefined)
};

const mockUseSemantest = jest.fn();

jest.mock('../hooks/use-semantest', () => ({
  useSemantest: () => mockUseSemantest()
}));

describe('ImageUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSemantest.mockReturnValue({
      client: mockClient,
      connected: true
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render upload area with default state', () => {
      render(<ImageUpload />);
      
      expect(screen.getByText('Drag and drop an image here or')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // SVG icon
    });

    it('should apply custom className', () => {
      const { container } = render(<ImageUpload className="custom-upload" />);
      expect(container.firstChild).toHaveClass('image-upload', 'custom-upload');
    });
  });

  describe('File Selection', () => {
    it('should handle file selection via input', async () => {
      const onUploadComplete = jest.fn();
      render(<ImageUpload onUploadComplete={onUploadComplete} />);
      
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      const input = screen.getByLabelText('Browse Files') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockClient.emit).toHaveBeenCalledWith({
          type: ImageEventTypes.REQUEST_RECEIVED,
          payload: {
            project: undefined,
            chat: undefined,
            prompt: 'test-image.png'
          }
        });
      });
      
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    it('should show error when not connected', async () => {
      mockUseSemantest.mockReturnValue({
        client: null,
        connected: false
      });
      
      render(<ImageUpload />);
      
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      const input = screen.getByLabelText('Browse Files') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Not connected to server')).toBeInTheDocument();
      });
    });

    it('should handle upload with project and chat IDs', async () => {
      render(<ImageUpload projectId="project-123" chatId="chat-456" />);
      
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      const input = screen.getByLabelText('Browse Files') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockClient.emit).toHaveBeenCalledWith({
          type: ImageEventTypes.REQUEST_RECEIVED,
          payload: {
            project: 'project-123',
            chat: 'chat-456',
            prompt: 'test-image.png'
          }
        });
      });
    });

    it('should complete upload and call onUploadComplete', async () => {
      const onUploadComplete = jest.fn();
      render(<ImageUpload onUploadComplete={onUploadComplete} />);
      
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      const input = screen.getByLabelText('Browse Files') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      // Fast forward the setTimeout
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(mockClient.emit).toHaveBeenCalledTimes(2);
        expect(mockClient.emit).toHaveBeenLastCalledWith({
          type: ImageEventTypes.DOWNLOADED,
          payload: {
            path: expect.stringMatching(/^\/uploads\/\d+-test-image\.png$/)
          }
        });
      });
      
      expect(onUploadComplete).toHaveBeenCalledWith(
        expect.stringMatching(/^\/uploads\/\d+-test-image\.png$/)
      );
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over', () => {
      const { container } = render(<ImageUpload />);
      const uploadArea = container.querySelector('.upload-area')!;
      
      fireEvent.dragOver(uploadArea);
      
      expect(uploadArea).toHaveClass('drag-active');
    });

    it('should handle drag leave', () => {
      const { container } = render(<ImageUpload />);
      const uploadArea = container.querySelector('.upload-area')!;
      
      fireEvent.dragOver(uploadArea);
      expect(uploadArea).toHaveClass('drag-active');
      
      fireEvent.dragLeave(uploadArea);
      expect(uploadArea).not.toHaveClass('drag-active');
    });

    it('should handle file drop', async () => {
      const onUploadComplete = jest.fn();
      const { container } = render(<ImageUpload onUploadComplete={onUploadComplete} />);
      const uploadArea = container.querySelector('.upload-area')!;
      
      const file = new File(['test'], 'dropped-image.jpg', { type: 'image/jpeg' });
      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'image/jpeg', getAsFile: () => file }],
        types: ['Files']
      };
      
      fireEvent.drop(uploadArea, { dataTransfer });
      
      await waitFor(() => {
        expect(mockClient.emit).toHaveBeenCalledWith({
          type: ImageEventTypes.REQUEST_RECEIVED,
          payload: {
            project: undefined,
            chat: undefined,
            prompt: 'dropped-image.jpg'
          }
        });
      });
      
      expect(uploadArea).not.toHaveClass('drag-active');
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    it('should ignore non-image files', async () => {
      const { container } = render(<ImageUpload />);
      const uploadArea = container.querySelector('.upload-area')!;
      
      const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'application/pdf', getAsFile: () => file }],
        types: ['Files']
      };
      
      fireEvent.drop(uploadArea, { dataTransfer });
      
      await waitFor(() => {
        expect(mockClient.emit).not.toHaveBeenCalled();
      });
      
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error when upload fails', async () => {
      mockClient.emit.mockRejectedValueOnce(new Error('Network error'));
      
      render(<ImageUpload />);
      
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      const input = screen.getByLabelText('Browse Files') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });

    it('should clear error on successful upload', async () => {
      mockUseSemantest.mockReturnValueOnce({
        client: null,
        connected: false
      });
      
      const { rerender } = render(<ImageUpload />);
      
      // First attempt - should show error
      const file1 = new File(['test'], 'test1.png', { type: 'image/png' });
      const input1 = screen.getByLabelText('Browse Files') as HTMLInputElement;
      fireEvent.change(input1, { target: { files: [file1] } });
      
      await waitFor(() => {
        expect(screen.getByText('Not connected to server')).toBeInTheDocument();
      });
      
      // Update to connected state
      mockUseSemantest.mockReturnValue({
        client: mockClient,
        connected: true
      });
      
      rerender(<ImageUpload />);
      
      // Second attempt - should clear error and upload
      const file2 = new File(['test'], 'test2.png', { type: 'image/png' });
      const input2 = screen.getByLabelText('Browse Files') as HTMLInputElement;
      fireEvent.change(input2, { target: { files: [file2] } });
      
      await waitFor(() => {
        expect(screen.queryByText('Not connected to server')).not.toBeInTheDocument();
        expect(screen.getByText('Uploading...')).toBeInTheDocument();
      });
    });
  });

  describe('UI States', () => {
    it('should disable interaction while uploading', async () => {
      const { container } = render(<ImageUpload />);
      const uploadArea = container.querySelector('.upload-area')!;
      
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      const input = screen.getByLabelText('Browse Files') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(uploadArea).toHaveClass('uploading');
        expect(screen.getByText('Uploading...')).toBeInTheDocument();
      });
      
      // Try to drop another file while uploading
      const file2 = new File(['test2'], 'test2.png', { type: 'image/png' });
      const dataTransfer = {
        files: [file2],
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file2 }],
        types: ['Files']
      };
      
      fireEvent.drop(uploadArea, { dataTransfer });
      
      // Should still only have one upload call
      expect(mockClient.emit).toHaveBeenCalledTimes(1);
    });

    it('should show spinner during upload', async () => {
      const { container } = render(<ImageUpload />);
      
      const file = new File(['test'], 'test-image.png', { type: 'image/png' });
      const input = screen.getByLabelText('Browse Files') as HTMLInputElement;
      
      fireEvent.change(input, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(container.querySelector('.spinner')).toBeInTheDocument();
        expect(container.querySelector('.upload-progress')).toBeInTheDocument();
      });
    });
  });
});