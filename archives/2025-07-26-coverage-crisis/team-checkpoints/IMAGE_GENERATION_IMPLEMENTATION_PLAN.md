# ChatGPT Image Generation Implementation Plan

## Overview
Implement end-to-end image generation workflow using ImageRequestReceived/ImageDownloaded events.

## Architecture

### Event Flow
1. User runs: `./generate-image.sh "a cat playing piano" ~/Pictures/`
2. Script sends `ImageRequestReceived` event to WebSocket server
3. Event handler processes the request:
   - If `chat` is null → Create new ChatGPT chat
   - If `project` is provided → Use it; if null → Don't create project
4. ChatGPT generates image
5. Download service saves image to specified folder (default: ~/Downloads/)
6. Emit `ImageDownloaded` event with file path
7. Script receives confirmation and displays result

### Event Definitions (Already in sdk/contracts/src/custom-events.ts)
```typescript
// ImageRequestReceived
{
  project?: string;    // Optional - if null, don't create project
  chat?: string;       // Optional - if null, create new chat
  prompt: string;      // Required - the image generation prompt
  metadata?: {
    requestId?: string;
    downloadFolder?: string;  // Custom field for download location
  }
}

// ImageDownloaded
{
  path: string;        // Required - path where image was saved
  metadata?: {
    size?: number;
    mimeType?: string;
    requestId?: string;  // To match with request
  }
}
```

## Implementation Tasks

### 1. WebSocket Server Event Handler (sdk/server/src/)
- Add handler for `ImageRequestReceived` event
- Create new chat if `chat` is null
- Handle project assignment logic

### 2. ChatGPT Integration (chatgpt.com/)
- Implement image generation API call
- Handle authentication and session management
- Return generated image URL

### 3. Download Service (browser/ or core/)
- Download image from URL
- Save to specified folder (default ~/Downloads/)
- Emit `ImageDownloaded` event with path

### 4. Shell Script Enhancement (generate-image.sh)
- Implement WebSocket client to send events
- Wait for `ImageDownloaded` response
- Display success message with file path

## File Structure

```
semantest/
├── generate-image.sh                    # Shell script (needs implementation)
├── sdk/
│   ├── contracts/src/custom-events.ts  # Events already defined ✓
│   ├── server/src/
│   │   ├── message-router.ts           # Add image event routing
│   │   └── handlers/
│   │       └── image-handler.ts        # New: Handle image events
│   └── client/src/
│       └── utils/image-client.ts       # New: Client utilities
├── chatgpt.com/
│   └── src/
│       └── services/
│           └── image-generator.ts      # New: ChatGPT image API
└── browser/src/
    └── services/
        └── image-downloader.ts         # New: Download service
```

## Testing Strategy

### Unit Tests
- Event handler logic
- Download service
- Error handling

### Integration Tests
- End-to-end workflow
- Event flow validation
- File system operations

### Manual Testing
```bash
# Test default download location
./generate-image.sh "a futuristic robot"

# Test custom download location
./generate-image.sh "a mountain landscape" ~/Pictures/

# Test with existing chat/project
./generate-image.sh "a cat" --chat="existing-chat-id" --project="my-project"
```

## Success Criteria
✅ Shell script sends ImageRequestReceived event
✅ New chat created when chat is null
✅ Project handled correctly (used if provided, ignored if null)
✅ Image downloaded to specified folder
✅ ImageDownloaded event emitted with correct path
✅ User sees success message with file location

## Error Handling
- Invalid prompt → Return error message
- Download failure → Retry with exponential backoff
- ChatGPT API error → Log and return user-friendly message
- File system error → Check permissions, suggest alternatives

## Security Considerations
- Validate file paths to prevent directory traversal
- Sanitize image filenames
- Check file size limits
- Validate image content type

## Timeline
1. Hour 1-2: Event handler implementation
2. Hour 2-3: ChatGPT integration
3. Hour 3-4: Download service
4. Hour 4-5: Shell script and testing
5. Hour 5-6: Integration testing and fixes