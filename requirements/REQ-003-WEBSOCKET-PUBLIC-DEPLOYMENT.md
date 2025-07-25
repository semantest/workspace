# REQ-003: WebSocket Server Public Deployment

## Overview
Deploy the Semantest WebSocket server as a publicly available service with intelligent local/remote fallback logic.

## Business Requirements

### BR-1: Zero-Configuration User Experience
- Users should be able to use the extension immediately after installation
- No requirement to run local servers for basic functionality
- Advanced users can still run local servers for development

### BR-2: Cost-Effective Scaling
- Use serverless architecture to minimize costs
- Pay only for actual usage
- Auto-scale based on demand

## Technical Requirements

### TR-1: Universal Connection Logic (Extension, SDK, Client)
ALL components (extension, SDK, client libraries) must implement the same connection sequence:

1. **Check Local Server** (http://localhost:3003/signature)
   - Timeout: 2 seconds
   - Expected response: `{"service": "semantest", "version": "1.0.0"}`
   - If successful AND signature matches, use `ws://localhost:3003`

2. **Fallback to Public Server**
   - If local fails or signature doesn't match
   - Connect to `wss://api.extension.semantest.com`
   - Use secure WebSocket (wss://) for public connection

### TR-2: Server Signature Endpoint
Implement `/signature` endpoint on WebSocket server:
```json
{
  "service": "semantest",
  "version": "1.0.0",
  "environment": "local|production",
  "capabilities": ["imageGeneration", "imageDownload"]
}
```

### TR-3: Public Server Infrastructure

#### Option A: AWS Lambda + API Gateway
- Use AWS Lambda for WebSocket handlers
- API Gateway WebSocket API for connection management
- DynamoDB for connection state
- S3 for image storage
- CloudFront for global distribution

#### Option B: Azure Functions + SignalR Service
- Azure Functions for serverless compute
- Azure SignalR Service for WebSocket management
- Cosmos DB for state management
- Blob Storage for images
- Azure CDN for distribution

### TR-4: Pulumi Infrastructure as Code
Dana must implement using Pulumi (TypeScript):

```typescript
// Example structure
export class SemantestWebSocketStack extends pulumi.ComponentResource {
  public readonly apiEndpoint: pulumi.Output<string>;
  public readonly websocketUrl: pulumi.Output<string>;
  
  constructor(name: string, args: SemantestStackArgs, opts?: pulumi.ComponentResourceOptions) {
    // Create API Gateway
    // Create Lambda functions
    // Create DynamoDB tables
    // Create S3 buckets
    // Set up CloudWatch monitoring
    // Configure custom domain
  }
}
```

### TR-5: Security Requirements
- TLS 1.3 for all public connections
- API key authentication for production use
- Rate limiting: 100 requests/minute per IP
- CORS configuration for extension origins
- Input validation and sanitization

### TR-6: Monitoring & Observability
- CloudWatch/Application Insights logging
- Connection metrics dashboard
- Error rate monitoring
- Latency tracking
- Cost tracking alerts

## Implementation Requirements

### IR-1: Environment Configuration
```yaml
environments:
  development:
    localFirst: true
    localUrl: "ws://localhost:3003"
    fallbackUrl: "wss://dev.api.extension.semantest.com"
  
  production:
    localFirst: false  # Can be overridden by user preference
    localUrl: "ws://localhost:3003"
    fallbackUrl: "wss://api.extension.semantest.com"
```

### IR-2: Extension Configuration
Add to extension settings:
- [ ] Toggle: "Prefer local server when available"
- [ ] Custom server URL override
- [ ] Connection status indicator
- [ ] Retry configuration

### IR-3: SDK/Client Connection Configuration
The SDK and client libraries must implement the same connection logic:

```typescript
// @semantest/sdk configuration
export class SemantestClient {
  constructor(options?: ClientOptions) {
    this.connectionStrategy = options?.connectionStrategy || {
      preferLocal: true,
      localUrl: 'ws://localhost:3003',
      remoteUrl: 'wss://api.extension.semantest.com',
      signatureTimeout: 2000,
      expectedSignature: {
        service: 'semantest',
        version: '1.0.0'
      }
    };
  }
  
  async connect(): Promise<void> {
    if (this.connectionStrategy.preferLocal) {
      try {
        const signature = await this.checkSignature(this.connectionStrategy.localUrl);
        if (signature.service === this.connectionStrategy.expectedSignature.service) {
          await this.connectTo(this.connectionStrategy.localUrl);
          return;
        }
      } catch (e) {
        // Fall through to remote
      }
    }
    await this.connectTo(this.connectionStrategy.remoteUrl);
  }
}
```

### IR-4: Visual Server Indication
The extension must provide visual feedback about which server is being used:

#### For Local Server Connection:
- Add subtle watermark: "Semantest Local Dev" 
- Position: Bottom-right corner, semi-transparent
- Color: Blue (#0066CC) with 20% opacity
- OR: Add thin top border (2px) in blue to the ChatGPT interface

#### For Remote Server Connection:
- Add subtle watermark: "Semantest Cloud"
- Position: Bottom-right corner, semi-transparent  
- Color: Green (#00AA44) with 20% opacity
- OR: Add thin top border (2px) in green to the ChatGPT interface

#### Implementation:
```css
/* Local server indicator */
.semantest-local-indicator {
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 102, 204, 0.2);
  color: #0066CC;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 9999;
}

/* Remote server indicator */
.semantest-remote-indicator {
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 170, 68, 0.2);
  color: #00AA44;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 9999;
}
```

The indicator should:
- Not interfere with ChatGPT's UI
- Be dismissible with a small 'x' button
- Reappear on connection change
- Include connection latency (e.g., "Local Dev - 5ms")

### IR-3: Server Health Checks
- `/health` endpoint returning 200 OK
- `/metrics` endpoint for monitoring
- Automatic health checks every 30 seconds

## Deployment Requirements

### DR-1: CI/CD Pipeline
- GitHub Actions workflow for deployment
- Automated testing before deployment
- Blue/green deployment strategy
- Rollback capability

### DR-2: Domain & SSL
- Register `api.extension.semantest.com`
- SSL certificate via AWS Certificate Manager or Let's Encrypt
- DNS configuration in Route53 or Azure DNS

### DR-3: Cost Management
- Set up billing alerts at $50/month
- Use AWS Free Tier / Azure Free Tier where possible
- Implement request throttling to prevent abuse

### IR-5: CLI Environment Variables
For command-line tools and scripts, support environment variables:

```bash
# Force local server
export SEMANTEST_SERVER=local
export SEMANTEST_LOCAL_URL=ws://localhost:3003

# Force remote server
export SEMANTEST_SERVER=remote
export SEMANTEST_REMOTE_URL=wss://api.extension.semantest.com

# Default behavior (check local first, fallback to remote)
unset SEMANTEST_SERVER
```

This allows developers to override the default behavior for testing and CI/CD pipelines.

## Testing Requirements

### TST-1: Connection Fallback Testing
- Test local server available → uses local
- Test local server unavailable → uses remote
- Test local server wrong signature → uses remote
- Test both servers unavailable → friendly error

### TST-2: Load Testing
- Support 1000 concurrent connections
- Handle 10,000 messages/second
- Graceful degradation under load

### TST-3: Latency Requirements
- Local connection: <10ms
- Public connection: <100ms globally
- Image upload/download: <5 seconds for 5MB

## Success Criteria
1. Extension works immediately after installation (no server setup)
2. Local development workflow still supported
3. Costs under $100/month for initial usage
4. 99.9% uptime for public server
5. Automatic failover between local/remote

## Timeline
- Day 1-2: Dana implements Pulumi infrastructure
- Day 3: Alex adapts server code for Lambda/Functions
- Day 4: Eva implements connection fallback logic
- Day 5: Quinn tests all scenarios
- Day 6: Deploy to production

## Notes
- Start with AWS Lambda (more WebSocket examples available)
- Consider WebSocket connection pooling for efficiency
- Plan for graceful shutdown and connection migration