---
id: backend
title: Backend REST API
sidebar_label: Backend API
---

# Backend REST API Reference

The Semantest Backend API provides RESTful endpoints for managing image downloads, sessions, and automation workflows. It complements the WebSocket server by offering traditional HTTP-based interactions.

## Base URL

```
https://api.semantest.com/v1
```

For local development:
```
http://localhost:3000/api/v1
```

## Authentication

The API supports multiple authentication methods:

### API Key Authentication

Include your API key in the request header:

```bash
curl -H "X-API-Key: your-api-key" \
  https://api.semantest.com/v1/images
```

### JWT Authentication

Use Bearer token authentication:

```bash
curl -H "Authorization: Bearer your-jwt-token" \
  https://api.semantest.com/v1/images
```

### OAuth 2.0

For third-party integrations:

```bash
curl -H "Authorization: Bearer oauth-access-token" \
  https://api.semantest.com/v1/images
```

## Rate Limiting

- **Default**: 100 requests per minute
- **Authenticated**: 1000 requests per minute
- **Enterprise**: Custom limits

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Common Headers

| Header | Description | Required |
|--------|-------------|----------|
| `Content-Type` | `application/json` | Yes for POST/PUT |
| `Accept` | `application/json` | No (default) |
| `X-Request-ID` | Unique request identifier | No |
| `X-Client-Version` | Client SDK version | No |

## Error Responses

Standard error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "query",
      "reason": "Query cannot be empty"
    },
    "timestamp": "2024-01-25T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

Error codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Endpoints

### Images

#### Download Images

Initiate a batch image download.

```http
POST /images/download
```

**Request Body:**

```json
{
  "source": "unsplash.com",
  "query": "sunset photography",
  "count": 10,
  "options": {
    "quality": "high",
    "minResolution": {
      "width": 1920,
      "height": 1080
    },
    "formats": ["jpeg", "png", "webp"],
    "safeSearch": true,
    "license": "commercial"
  },
  "metadata": {
    "project": "website-hero",
    "tags": ["hero", "landing"]
  }
}
```

**Response:**

```json
{
  "jobId": "job_xyz789",
  "status": "queued",
  "estimatedTime": 45,
  "queuePosition": 3,
  "links": {
    "status": "/jobs/job_xyz789",
    "cancel": "/jobs/job_xyz789/cancel",
    "results": "/jobs/job_xyz789/results"
  }
}
```

#### Get Image by ID

Retrieve image metadata and download URL.

```http
GET /images/{imageId}
```

**Response:**

```json
{
  "id": "img_abc123",
  "url": "https://cdn.semantest.com/images/img_abc123.jpg",
  "metadata": {
    "width": 3840,
    "height": 2160,
    "format": "jpeg",
    "size": 2548762,
    "colorSpace": "sRGB",
    "hasAlpha": false
  },
  "source": {
    "url": "https://unsplash.com/photos/abc123",
    "author": "John Doe",
    "license": "Unsplash License"
  },
  "downloadedAt": "2024-01-25T10:30:00Z",
  "tags": ["sunset", "landscape", "nature"],
  "quality": {
    "score": 95,
    "resolution": "4K",
    "sharpness": "excellent"
  }
}
```

#### Search Images

Search downloaded images.

```http
GET /images?query=sunset&source=unsplash.com&limit=20&offset=0
```

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `query` | string | Search query | - |
| `source` | string | Filter by source domain | - |
| `tags` | array | Filter by tags | - |
| `minQuality` | number | Minimum quality score (0-100) | 0 |
| `formats` | array | Filter by formats | - |
| `dateFrom` | string | Start date (ISO 8601) | - |
| `dateTo` | string | End date (ISO 8601) | - |
| `limit` | number | Results per page | 20 |
| `offset` | number | Pagination offset | 0 |
| `sort` | string | Sort field | `downloadedAt` |
| `order` | string | Sort order (`asc`/`desc`) | `desc` |

**Response:**

```json
{
  "data": [
    {
      "id": "img_abc123",
      "url": "https://cdn.semantest.com/images/img_abc123.jpg",
      "thumbnail": "https://cdn.semantest.com/thumbs/img_abc123.jpg",
      "metadata": {
        "width": 3840,
        "height": 2160,
        "format": "jpeg"
      },
      "quality": 95,
      "tags": ["sunset", "landscape"]
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Delete Image

Delete an image and its metadata.

```http
DELETE /images/{imageId}
```

**Response:**

```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### Jobs

#### Get Job Status

Check the status of a download job.

```http
GET /jobs/{jobId}
```

**Response:**

```json
{
  "id": "job_xyz789",
  "type": "image_download",
  "status": "processing",
  "progress": {
    "current": 3,
    "total": 10,
    "percent": 30
  },
  "startedAt": "2024-01-25T10:30:00Z",
  "estimatedCompletion": "2024-01-25T10:31:00Z",
  "results": {
    "succeeded": 3,
    "failed": 0,
    "pending": 7
  }
}
```

#### Get Job Results

Retrieve results of a completed job.

```http
GET /jobs/{jobId}/results
```

**Response:**

```json
{
  "jobId": "job_xyz789",
  "status": "completed",
  "summary": {
    "requested": 10,
    "downloaded": 9,
    "failed": 1,
    "duration": 45.2
  },
  "images": [
    {
      "id": "img_abc123",
      "url": "https://cdn.semantest.com/images/img_abc123.jpg",
      "size": 2548762,
      "metadata": { /* ... */ }
    }
  ],
  "errors": [
    {
      "url": "https://example.com/image.jpg",
      "error": "TIMEOUT",
      "message": "Download timeout after 30s"
    }
  ]
}
```

#### Cancel Job

Cancel a running job.

```http
POST /jobs/{jobId}/cancel
```

**Response:**

```json
{
  "success": true,
  "message": "Job cancelled",
  "refund": {
    "credits": 7,
    "reason": "Partial completion"
  }
}
```

### Sessions

#### Create Session

Create a new automation session.

```http
POST /sessions
```

**Request Body:**

```json
{
  "name": "Product Image Collection",
  "type": "persistent",
  "config": {
    "browser": "chrome",
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "userAgent": "custom-agent"
  },
  "metadata": {
    "project": "e-commerce",
    "environment": "production"
  }
}
```

**Response:**

```json
{
  "id": "session_def456",
  "name": "Product Image Collection",
  "status": "active",
  "websocketUrl": "wss://ws.semantest.com/sessions/session_def456",
  "createdAt": "2024-01-25T10:30:00Z",
  "expiresAt": "2024-01-26T10:30:00Z"
}
```

#### Get Session

Retrieve session details.

```http
GET /sessions/{sessionId}
```

**Response:**

```json
{
  "id": "session_def456",
  "name": "Product Image Collection",
  "status": "active",
  "statistics": {
    "commandsExecuted": 45,
    "imagesDownloaded": 123,
    "errors": 2,
    "duration": 3600
  },
  "currentState": {
    "url": "https://example.com/gallery",
    "readyState": "complete"
  }
}
```

#### List Sessions

Get all sessions for the authenticated user.

```http
GET /sessions?status=active&limit=10
```

**Response:**

```json
{
  "data": [
    {
      "id": "session_def456",
      "name": "Product Image Collection",
      "status": "active",
      "createdAt": "2024-01-25T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 3,
    "limit": 10,
    "offset": 0
  }
}
```

### Analytics

#### Get Usage Statistics

Retrieve usage statistics.

```http
GET /analytics/usage?period=30d
```

**Response:**

```json
{
  "period": {
    "start": "2023-12-26T00:00:00Z",
    "end": "2024-01-25T23:59:59Z"
  },
  "summary": {
    "totalDownloads": 4532,
    "totalSize": 15698745632,
    "totalJobs": 156,
    "successRate": 0.94
  },
  "breakdown": {
    "bySource": {
      "unsplash.com": 2341,
      "pexels.com": 1876,
      "pixabay.com": 315
    },
    "byFormat": {
      "jpeg": 3421,
      "png": 876,
      "webp": 235
    },
    "byQuality": {
      "high": 2987,
      "medium": 1234,
      "low": 311
    }
  },
  "timeline": [
    {
      "date": "2024-01-25",
      "downloads": 156,
      "size": 523487632
    }
  ]
}
```

#### Get Performance Metrics

Monitor API performance.

```http
GET /analytics/performance
```

**Response:**

```json
{
  "metrics": {
    "avgResponseTime": 145.3,
    "p95ResponseTime": 523.7,
    "p99ResponseTime": 1245.2,
    "successRate": 0.998,
    "errorRate": 0.002
  },
  "endpoints": [
    {
      "path": "/images/download",
      "method": "POST",
      "avgTime": 234.5,
      "requests": 1523
    }
  ],
  "health": {
    "status": "healthy",
    "uptime": 0.999,
    "lastIncident": "2024-01-20T15:30:00Z"
  }
}
```

### Webhooks

#### Register Webhook

Register a webhook for events.

```http
POST /webhooks
```

**Request Body:**

```json
{
  "url": "https://your-app.com/webhooks/semantest",
  "events": [
    "job.completed",
    "job.failed",
    "image.downloaded"
  ],
  "secret": "webhook_secret_key",
  "active": true
}
```

**Response:**

```json
{
  "id": "webhook_ghi789",
  "url": "https://your-app.com/webhooks/semantest",
  "events": ["job.completed", "job.failed", "image.downloaded"],
  "status": "active",
  "createdAt": "2024-01-25T10:30:00Z"
}
```

#### Webhook Event Format

```json
{
  "id": "evt_jkl012",
  "type": "job.completed",
  "timestamp": "2024-01-25T10:30:00Z",
  "data": {
    "jobId": "job_xyz789",
    "status": "completed",
    "results": { /* ... */ }
  },
  "signature": "sha256=..."
}
```

### Account

#### Get Account Info

Retrieve account details.

```http
GET /account
```

**Response:**

```json
{
  "id": "user_mno345",
  "email": "user@example.com",
  "plan": "professional",
  "usage": {
    "downloads": {
      "used": 4532,
      "limit": 10000,
      "resetDate": "2024-02-01T00:00:00Z"
    },
    "storage": {
      "used": 15698745632,
      "limit": 107374182400
    },
    "apiCalls": {
      "used": 45632,
      "limit": 1000000
    }
  },
  "billing": {
    "status": "active",
    "nextBillingDate": "2024-02-01T00:00:00Z"
  }
}
```

## SDKs

Official SDKs are available for:

- [JavaScript/TypeScript](https://github.com/semantest/js-sdk)
- [Python](https://github.com/semantest/python-sdk)
- [Go](https://github.com/semantest/go-sdk)
- [Java](https://github.com/semantest/java-sdk)

## Postman Collection

Download our [Postman collection](https://api.semantest.com/postman/collection.json) for easy API exploration.

## OpenAPI Specification

View our [OpenAPI 3.0 specification](https://api.semantest.com/openapi.yaml) for detailed schema information.

## Support

- [API Status](https://status.semantest.com)
- [Developer Forum](https://forum.semantest.com)
- [Support Email](mailto:api-support@semantest.com)