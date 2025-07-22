import React, { useState, useCallback } from 'react';
import { useSemantest } from './hooks';
import { ImageEventTypes } from '@semantest/contracts';

interface ImageUploadProps {
  projectId?: string;
  chatId?: string;
  onUploadComplete?: (path: string) => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  projectId,
  chatId,
  onUploadComplete,
  className = ''
}) => {
  const { client, connected } = useSemantest();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!connected || !client) {
      setError('Not connected to server');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Send image request event
      await client.emit({
        type: ImageEventTypes.REQUEST_RECEIVED,
        payload: {
          project: projectId,
          chat: chatId,
          prompt: file.name
        }
      });

      // Simulate upload (in real app, upload to storage)
      setTimeout(() => {
        const mockPath = `/uploads/${Date.now()}-${file.name}`;
        
        // Send download complete event
        client.emit({
          type: ImageEventTypes.DOWNLOADED,
          payload: {
            path: mockPath
          }
        });

        setUploading(false);
        onUploadComplete?.(mockPath);
      }, 2000);
    } catch (err) {
      setError('Upload failed');
      setUploading(false);
    }
  }, [client, connected, projectId, chatId, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  return (
    <div className={`image-upload ${className}`}>
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="upload-progress">
            <div className="spinner" />
            <p>Uploading...</p>
          </div>
        ) : (
          <>
            <svg className="upload-icon" width="50" height="50" viewBox="0 0 24 24">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
            <p>Drag and drop an image here or</p>
            <label className="file-select-button">
              Browse Files
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </>
        )}
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

// Basic styles (in real app, use CSS modules or styled-components)
const styles = `
.image-upload {
  width: 100%;
  max-width: 400px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area.drag-active {
  border-color: #4CAF50;
  background-color: #f5f5f5;
}

.upload-area.uploading {
  cursor: not-allowed;
  opacity: 0.7;
}

.upload-icon {
  fill: #666;
  margin-bottom: 20px;
}

.file-select-button {
  display: inline-block;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4CAF50;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #f44336;
  margin-top: 10px;
}
`;

// Add styles to document (in real app, use proper CSS handling)
if (typeof document !== 'undefined' && !document.getElementById('image-upload-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'image-upload-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ImageUpload;