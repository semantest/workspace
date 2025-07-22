# ChatGPT Image Generation Project

## Overview
Implement an end-to-end image generation system using the new ImageRequestReceived and ImageDownloaded events.

## Requirements

### Event Schemas

#### ImageRequestReceived Event
```typescript
{
  type: "chatgpt:image/request-received",
  payload: {
    project?: string,  // Optional - if null, don't create project
    chat?: string,     // Optional - if null, create new chat
    prompt: string     // Required - the image generation prompt
  }
}
```

#### ImageDownloaded Event
```typescript
{
  type: "chatgpt:image/downloaded",
  payload: {
    path: string      // File path where image was saved
  }
}
```

### Functional Requirements

1. **Event Handling**
   - Listen for ImageRequestReceived events on WebSocket
   - Process the image generation request
   - Emit ImageDownloaded event when complete

2. **Business Logic**
   - If `chat` is null, create a new chat session
   - If `project` is null, don't create a project
   - Save generated images to the specified download folder (default: ~/Downloads)

3. **Shell Script Interface**
   - Create `generate-image.sh` script
   - Accept prompt as first argument
   - Accept optional download folder as second argument
   - Display progress and result to user

### Technical Implementation

1. **Backend Components**
   - WebSocket event handler for ImageRequestReceived
   - Image generation service (can use placeholder for testing)
   - File download and storage service
   - Event emitter for ImageDownloaded

2. **Testing**
   - Unit tests for event handlers
   - E2E test for complete flow
   - Shell script integration test

3. **Security**
   - Validate file paths to prevent directory traversal
   - Sanitize prompts for safe file naming
   - Ensure proper error handling

## Example Usage

```bash
# Generate image with custom prompt
./generate-image.sh "A majestic dragon flying over a crystal castle"

# Generate image to specific folder
./generate-image.sh "Cyberpunk city at night" ~/Pictures/ai-generated

# Default usage (uses default prompt)
./generate-image.sh
```

## Success Criteria

1. ✅ Shell script successfully sends ImageRequestReceived event
2. ✅ Backend processes request and downloads/generates image
3. ✅ Image saved to specified folder with sanitized filename
4. ✅ ImageDownloaded event received with correct file path
5. ✅ User sees confirmation with path to downloaded image

## Team Assignments

- **PM**: Overall coordination and quality assurance
- **Architect**: System design and integration planning
- **Backend1**: WebSocket event handlers and chat logic
- **Backend2**: Image download service and file operations
- **Frontend**: Test UI for manual testing
- **QA**: E2E tests and test scenarios
- **DevOps**: Shell script implementation
- **Security**: Path validation and security review
- **Scribe**: API documentation and user guide