# Pulumi Quick Start for Dana - WebSocket Deployment

## Immediate Action Items

### 1. Create Pulumi Project
```bash
mkdir semantest-infrastructure
cd semantest-infrastructure
pulumi new aws-typescript  # or azure-typescript

# Install dependencies
npm install @pulumi/aws @pulumi/awsx
# or
npm install @pulumi/azure-native @pulumi/azuread
```

### 2. Key Resources to Create (AWS Example)

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// 1. API Gateway WebSocket API
const websocketApi = new aws.apigatewayv2.Api("semantest-websocket", {
    protocolType: "WEBSOCKET",
    routeSelectionExpression: "$request.body.action",
});

// 2. Lambda for WebSocket handling
const websocketHandler = new aws.lambda.Function("websocket-handler", {
    runtime: "nodejs18.x",
    code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive("./lambda"),
    }),
    handler: "index.handler",
    environment: {
        variables: {
            CONNECTIONS_TABLE: connectionsTable.name,
        },
    },
});

// 3. DynamoDB for connection tracking
const connectionsTable = new aws.dynamodb.Table("connections", {
    attributes: [{
        name: "connectionId",
        type: "S",
    }],
    hashKey: "connectionId",
    billingMode: "PAY_PER_REQUEST",
});

// 4. Routes and integrations
const connectRoute = new aws.apigatewayv2.Route("connect-route", {
    apiId: websocketApi.id,
    routeKey: "$connect",
    target: pulumi.interpolate`integrations/${connectIntegration.id}`,
});

// 5. Custom domain
const certificate = new aws.acm.Certificate("api-cert", {
    domainName: "api.extension.semantest.com",
    validationMethod: "DNS",
});

// Export the WebSocket URL
export const websocketUrl = websocketApi.apiEndpoint;
```

### 3. Lambda Function Structure
```
lambda/
├── index.js          # Main handler
├── connect.js        # $connect route
├── disconnect.js     # $disconnect route
├── message.js        # Message handling
├── signature.js      # /signature endpoint
└── package.json
```

### 4. Environment Variables Needed
```typescript
const config = {
    DOMAIN_NAME: "api.extension.semantest.com",
    ENVIRONMENT: pulumi.getStack(), // dev, staging, prod
    SIGNATURE_VERSION: "1.0.0",
    MAX_CONNECTIONS: "1000",
    RATE_LIMIT: "100", // requests per minute
};
```

### 5. Essential IAM Permissions
```typescript
const lambdaRole = new aws.iam.Role("lambda-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "lambda.amazonaws.com",
    }),
});

// Attach policies for:
// - DynamoDB access
// - API Gateway management
// - CloudWatch logs
// - S3 for images (if needed)
```

## Quick Commands for Dana

```bash
# Initialize
pulumi new aws-typescript --name semantest-websocket

# Deploy to dev
pulumi up -s dev

# Deploy to production
pulumi up -s production

# Check outputs
pulumi stack output websocketUrl

# Destroy if needed
pulumi destroy
```

## Critical Implementation Notes

1. **Connection Management**: Store WebSocket connectionIds in DynamoDB
2. **Message Routing**: Use `action` field in messages for routing
3. **Error Handling**: Always return proper error codes to API Gateway
4. **CORS**: Configure for Chrome extension origin
5. **Monitoring**: Set up CloudWatch alarms for errors and costs

## Next Steps for Dana
1. ~~Set up AWS/Azure account and credentials~~ **rydnr will provide AWS access when needed**
2. Create Pulumi project locally
3. Implement basic WebSocket echo server
4. Add signature endpoint
5. Test infrastructure code locally with `pulumi preview`
6. **Request AWS credentials from rydnr via PM**
7. Deploy to dev environment
8. Share endpoint with Eva for testing

## Note from rydnr
AWS access will be provided when you're ready to deploy. Focus on getting the Pulumi code ready first, then request credentials through the PM when you need to actually deploy to AWS.