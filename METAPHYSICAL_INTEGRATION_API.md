# 🚀 SEMANTEST + METAPHYSICAL INTEGRATION API

**CRITICAL**: This document outlines the API integration between Semantest and Metaphysical for image generation capabilities.

## 🎯 Integration Overview

Metaphysical will leverage Semantest's multi-provider image generation API to power their creative workflows. Our addon provides:

- **Multi-Provider Support**: DALL-E 3, Stable Diffusion, Midjourney (coming soon)
- **Batch Processing**: Generate multiple images in parallel
- **Async Operations**: Webhook-based notifications for completed jobs
- **Smart Failover**: Automatic provider switching on failures
- **Load Balancing**: Distribute requests across providers

## 📡 API Endpoints

### 1. Primary Endpoint - New Chat with Image Generation
```
POST /api/v1/chat/new
Authorization: Bearer <API_KEY>
```

**Request Body:**
```json
{
  "userId": "metaphysical-user-123",
  "sessionId": "optional-session-id",
  "prompt": "A futuristic city with floating buildings",
  "imageGeneration": {
    "enabled": true,
    "provider": "dalle", // or "stable-diffusion", "auto"
    "size": "1024x1024",
    "count": 4,
    "quality": "hd",
    "webhookUrl": "https://api.metaphysical.com/webhooks/image-ready",
    "webhookEvents": ["completed", "failed", "progress"]
  }
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "messageId": "msg_xyz789",
  "chatResponse": {
    "content": "I'll generate 4 images of a futuristic city...",
    "role": "assistant",
    "timestamp": "2025-08-03T14:00:00Z"
  },
  "imageGenerationJob": {
    "jobId": "job_123456",
    "status": "processing",
    "statusUrl": "/api/v1/images/status/job_123456",
    "estimatedCompletionTime": "2025-08-03T14:02:00Z"
  }
}
```

### 2. Batch Image Generation
```
POST /api/v1/images/batch
Authorization: Bearer <API_KEY>
```

**Request Body:**
```json
{
  "userId": "metaphysical-user-123",
  "webhookUrl": "https://api.metaphysical.com/webhooks/batch-ready",
  "jobs": [
    {
      "prompt": "Cyberpunk street scene",
      "size": "1792x1024",
      "provider": "dalle",
      "count": 2
    },
    {
      "prompt": "Abstract digital art",
      "size": "1024x1024", 
      "provider": "stable-diffusion",
      "count": 4,
      "negativePrompt": "blurry, low quality"
    }
  ]
}
```

### 3. Job Status Check
```
GET /api/v1/images/status/{jobId}
Authorization: Bearer <API_KEY>
```

### 4. Provider Capabilities
```
GET /api/v1/providers
Authorization: Bearer <API_KEY>
```

## 🔄 Webhook Integration

When jobs complete, Semantest will POST to your webhook:

```json
{
  "event": "image.generation.completed",
  "jobId": "job_123456",
  "status": "completed",
  "images": [
    {
      "url": "https://cdn.semantest.com/images/abc123.png",
      "size": "1024x1024",
      "provider": "dalle",
      "seed": 12345
    }
  ],
  "metadata": {
    "processingTime": 1500,
    "creditsUsed": 4
  }
}
```

## 🚀 Quick Start Integration

### 1. Get API Key
Contact Semantest team for Metaphysical-specific API key with enhanced limits.

### 2. Test Single Generation
```bash
curl -X POST https://api.semantest.com/api/v1/images/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "prompt": "Test image generation",
    "size": "1024x1024",
    "provider": "dalle"
  }'
```

### 3. Browser Extension Integration
The Semantest browser extension can inject image generation buttons directly into Metaphysical's UI:

```javascript
// Extension will expose this global
window.semantest.generateImage({
  prompt: "User's creative prompt",
  onComplete: (images) => {
    // Handle generated images
  }
});
```

## 📊 Rate Limits & Quotas

**Metaphysical Tier - UNLIMITED**:
- 1000 requests/minute
- 50 concurrent jobs
- Priority queue access
- Dedicated provider instances

## 🔧 Advanced Features

### Provider Selection Strategy
- `auto`: Let Semantest choose optimal provider
- `dalle`: Force DALL-E 3 (best quality)
- `stable-diffusion`: Force Stable Diffusion (most options)
- `fastest`: Choose fastest available provider
- `cheapest`: Optimize for cost

### Batch Optimization
- Group similar prompts for provider efficiency
- Automatic job distribution across providers
- Smart retry with fallback providers

## 🚨 Error Handling

All errors follow consistent format:
```json
{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "DALL-E provider temporarily unavailable",
    "details": {
      "fallbackProvider": "stable-diffusion",
      "retryAfter": 30
    },
    "traceId": "trace_123456"
  }
}
```

## 📞 Support & Escalation

- **API Issues**: alex@semantest.com
- **Integration Support**: eva@semantest.com  
- **Performance/Scale**: dana@semantest.com
- **Architecture**: aria@semantest.com

## 🎯 Next Steps

1. **API Key**: Semantest team will provide dedicated key
2. **Test Environment**: https://staging.semantest.com/api/v1
3. **Load Testing**: Coordinate with Dana for capacity planning
4. **UI Integration**: Eva will assist with browser extension setup

---

**THIS IS THE KEY INTEGRATION! Full team support available 24/7 for Metaphysical launch! 🚀**