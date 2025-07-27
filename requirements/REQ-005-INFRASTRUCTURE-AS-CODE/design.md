# Design Document: Infrastructure as Code for Semantest

## Architecture Overview

### Domain-Driven Design Structure

```
semantest-infrastructure/
├── domain/                      # Core domain logic
│   ├── model/                  # Domain entities and value objects
│   │   ├── deployment/
│   │   │   ├── Deployment.ts
│   │   │   ├── DeploymentStatus.ts
│   │   │   └── DeploymentConfiguration.ts
│   │   ├── compute/
│   │   │   ├── ServerlessFunction.ts
│   │   │   ├── FunctionRuntime.ts
│   │   │   └── ScalingPolicy.ts
│   │   └── networking/
│   │       ├── ApiGateway.ts
│   │       ├── Route.ts
│   │       └── SecurityPolicy.ts
│   ├── events/                 # Domain events
│   │   ├── DeploymentRequested.ts
│   │   ├── DeploymentCompleted.ts
│   │   ├── DeploymentFailed.ts
│   │   └── InfrastructureUpdated.ts
│   └── services/               # Domain services
│       ├── DeploymentService.ts
│       └── ValidationService.ts
├── application/                 # Application layer
│   ├── commands/               # Command handlers
│   │   ├── DeployRestApiCommand.ts
│   │   ├── DeployWebSocketCommand.ts
│   │   └── RollbackDeploymentCommand.ts
│   ├── queries/                # Query handlers
│   │   ├── GetDeploymentStatusQuery.ts
│   │   └── ListDeploymentsQuery.ts
│   └── sagas/                  # Process orchestration
│       └── DeploymentSaga.ts
├── infrastructure/              # Infrastructure adapters
│   ├── pulumi/                 # Pulumi implementation
│   │   ├── providers/
│   │   │   ├── AwsProvider.ts
│   │   │   └── AzureProvider.ts
│   │   ├── stacks/
│   │   │   ├── RestApiStack.ts
│   │   │   └── WebSocketStack.ts
│   │   └── PulumiAdapter.ts
│   ├── eventbus/               # Event system integration
│   │   └── SemantestEventBusAdapter.ts
│   └── persistence/            # State management
│       └── StateRepository.ts
└── presentation/               # CLI and API
    ├── cli/
    │   └── commands/
    └── api/
        └── routes/
```

### Hexagonal Architecture Layers

#### Core Domain (Center)
- Pure business logic for infrastructure management
- No dependencies on external frameworks
- Event-driven state transitions

#### Ports (Interfaces)
```typescript
// Outbound port for cloud operations
interface CloudProvider {
  deployFunction(spec: FunctionSpecification): Promise<FunctionDeployment>;
  deployApiGateway(spec: ApiGatewaySpecification): Promise<ApiGatewayDeployment>;
  rollback(deploymentId: string): Promise<void>;
}

// Outbound port for event publishing
interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

// Inbound port for deployment operations
interface DeploymentUseCase {
  deployRestApi(config: RestApiConfiguration): Promise<DeploymentResult>;
  deployWebSocket(config: WebSocketConfiguration): Promise<DeploymentResult>;
}
```

#### Adapters (Implementation)
- **Primary Adapters**: CLI commands, REST API endpoints
- **Secondary Adapters**: Pulumi providers, Event bus, State storage

## Detailed Design

### Domain Model

#### Deployment Aggregate
```typescript
export class Deployment {
  private id: DeploymentId;
  private status: DeploymentStatus;
  private configuration: DeploymentConfiguration;
  private components: Component[];
  private events: DomainEvent[] = [];

  constructor(config: DeploymentConfiguration) {
    this.id = DeploymentId.generate();
    this.status = DeploymentStatus.PENDING;
    this.configuration = config;
    this.validateConfiguration();
  }

  execute(): void {
    if (!this.canExecute()) {
      throw new InvalidStateError('Deployment cannot be executed');
    }
    
    this.status = DeploymentStatus.IN_PROGRESS;
    this.addEvent(new DeploymentStarted(this.id, this.configuration));
  }

  complete(results: DeploymentResult[]): void {
    this.status = DeploymentStatus.COMPLETED;
    this.addEvent(new DeploymentCompleted(this.id, results));
  }

  fail(error: Error): void {
    this.status = DeploymentStatus.FAILED;
    this.addEvent(new DeploymentFailed(this.id, error));
  }

  private canExecute(): boolean {
    return this.status === DeploymentStatus.PENDING;
  }
}
```

#### ServerlessFunction Value Object
```typescript
export class ServerlessFunction {
  constructor(
    public readonly name: string,
    public readonly runtime: Runtime,
    public readonly handler: string,
    public readonly memory: number,
    public readonly timeout: number,
    public readonly environment: Record<string, string>
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.memory < 128 || this.memory > 3008) {
      throw new ValidationError('Memory must be between 128 and 3008 MB');
    }
    if (this.timeout < 1 || this.timeout > 900) {
      throw new ValidationError('Timeout must be between 1 and 900 seconds');
    }
  }
}
```

### Application Services

#### Deployment Command Handler
```typescript
export class DeployRestApiCommandHandler {
  constructor(
    private deploymentService: DeploymentService,
    private cloudProvider: CloudProvider,
    private eventBus: EventPublisher
  ) {}

  async handle(command: DeployRestApiCommand): Promise<DeploymentResult> {
    // Create deployment aggregate
    const deployment = new Deployment({
      component: 'rest-api',
      provider: command.provider,
      environment: command.environment,
      configuration: command.configuration
    });

    // Start deployment
    deployment.execute();
    await this.eventBus.publish(...deployment.getEvents());

    try {
      // Deploy through adapter
      const result = await this.cloudProvider.deployFunction({
        name: `semantest-rest-api-${command.environment}`,
        runtime: Runtime.NODEJS_18,
        handler: 'dist/api/handler.main',
        memory: 512,
        timeout: 30,
        environment: command.configuration.environment
      });

      // Complete deployment
      deployment.complete([result]);
      await this.eventBus.publish(...deployment.getEvents());

      return result;
    } catch (error) {
      deployment.fail(error);
      await this.eventBus.publish(...deployment.getEvents());
      throw error;
    }
  }
}
```

### Infrastructure Adapters

#### Pulumi AWS Adapter
```typescript
export class AwsPulumiAdapter implements CloudProvider {
  async deployFunction(spec: FunctionSpecification): Promise<FunctionDeployment> {
    const stack = await LocalWorkspace.createOrSelectStack({
      stackName: spec.name,
      projectName: "semantest-infrastructure",
      program: async () => {
        // Create IAM role
        const role = new aws.iam.Role(`${spec.name}-role`, {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "lambda.amazonaws.com"
          })
        });

        // Attach policies
        new aws.iam.RolePolicyAttachment(`${spec.name}-policy`, {
          role: role,
          policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole
        });

        // Create Lambda function
        const lambda = new aws.lambda.Function(spec.name, {
          runtime: this.mapRuntime(spec.runtime),
          handler: spec.handler,
          role: role.arn,
          memorySize: spec.memory,
          timeout: spec.timeout,
          environment: {
            variables: spec.environment
          },
          code: new pulumi.asset.FileArchive("./dist")
        });

        // Create API Gateway
        const api = new aws.apigatewayv2.Api(`${spec.name}-api`, {
          protocolType: "HTTP",
          corsConfiguration: {
            allowOrigins: ["*"],
            allowMethods: ["GET", "POST", "PUT", "DELETE"],
            allowHeaders: ["content-type", "authorization"]
          }
        });

        // Create integration
        const integration = new aws.apigatewayv2.Integration(`${spec.name}-integration`, {
          apiId: api.id,
          integrationType: "AWS_PROXY",
          integrationUri: lambda.arn,
          payloadFormatVersion: "2.0"
        });

        // Create route
        const route = new aws.apigatewayv2.Route(`${spec.name}-route`, {
          apiId: api.id,
          routeKey: "$default",
          target: pulumi.interpolate`integrations/${integration.id}`
        });

        // Create stage
        const stage = new aws.apigatewayv2.Stage(`${spec.name}-stage`, {
          apiId: api.id,
          name: "$default",
          autoDeploy: true
        });

        // Grant API Gateway permission to invoke Lambda
        new aws.lambda.Permission(`${spec.name}-permission`, {
          action: "lambda:InvokeFunction",
          function: lambda.name,
          principal: "apigateway.amazonaws.com",
          sourceArn: pulumi.interpolate`${api.executionArn}/*/*`
        });

        return {
          functionArn: lambda.arn,
          apiEndpoint: api.apiEndpoint
        };
      }
    });

    const result = await stack.up();
    
    return {
      id: spec.name,
      arn: result.outputs.functionArn.value as string,
      endpoint: result.outputs.apiEndpoint.value as string,
      provider: 'aws',
      status: 'deployed'
    };
  }

  private mapRuntime(runtime: Runtime): string {
    const runtimeMap = {
      [Runtime.NODEJS_18]: "nodejs18.x",
      [Runtime.NODEJS_16]: "nodejs16.x",
      [Runtime.PYTHON_39]: "python3.9"
    };
    return runtimeMap[runtime];
  }
}
```

### Event Integration

#### Event Bus Adapter
```typescript
export class SemantestEventBusAdapter implements EventPublisher {
  constructor(private messageBus: MessageBus) {}

  async publish(event: DomainEvent): Promise<void> {
    // Transform domain event to Semantest event format
    const semantestEvent = {
      id: event.aggregateId,
      type: this.mapEventType(event),
      timestamp: event.occurredAt,
      payload: event.payload,
      metadata: {
        source: 'infrastructure',
        version: event.version
      }
    };

    await this.messageBus.publish('infrastructure.events', semantestEvent);
  }

  private mapEventType(event: DomainEvent): string {
    const eventTypeMap = {
      'DeploymentRequested': 'infrastructure.deployment.requested',
      'DeploymentCompleted': 'infrastructure.deployment.completed',
      'DeploymentFailed': 'infrastructure.deployment.failed'
    };
    
    return eventTypeMap[event.constructor.name] || 'infrastructure.unknown';
  }
}
```

### CLI Implementation

#### Main CLI Entry Point
```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { DeployCommand } from './commands/DeployCommand';
import { StatusCommand } from './commands/StatusCommand';
import { RollbackCommand } from './commands/RollbackCommand';

const program = new Command();

program
  .name('semantest-iac')
  .description('Infrastructure as Code for Semantest')
  .version('1.0.0');

// Deploy command
program
  .command('deploy')
  .description('Deploy infrastructure components')
  .option('--component <type>', 'Component to deploy (rest-api, websocket, all)')
  .option('--provider <provider>', 'Cloud provider (aws, azure)')
  .option('--env <environment>', 'Environment (development, staging, production)')
  .option('--config <path>', 'Configuration file path')
  .action(async (options) => {
    const command = new DeployCommand();
    await command.execute(options);
  });

// Status command
program
  .command('status')
  .description('Check deployment status')
  .option('--deployment <id>', 'Deployment ID')
  .action(async (options) => {
    const command = new StatusCommand();
    await command.execute(options);
  });

// Rollback command
program
  .command('rollback')
  .description('Rollback a deployment')
  .requiredOption('--deployment <id>', 'Deployment ID to rollback')
  .action(async (options) => {
    const command = new RollbackCommand();
    await command.execute(options);
  });

program.parse();
```

### Configuration Schema

#### Environment Configuration
```yaml
# config/production.yaml
provider: aws
region: us-east-1
environment: production

components:
  rest-api:
    memory: 1024
    timeout: 30
    instances:
      min: 2
      max: 10
    environment:
      NODE_ENV: production
      API_VERSION: v1
      DATABASE_URL: ${secrets.database_url}
  
  websocket:
    memory: 512
    timeout: 300
    instances:
      min: 1
      max: 5
    environment:
      NODE_ENV: production
      WS_VERSION: v1
      REDIS_URL: ${secrets.redis_url}

monitoring:
  enabled: true
  alerts:
    - type: error_rate
      threshold: 0.01
    - type: latency
      threshold: 1000

scaling:
  auto_scale: true
  metrics:
    - type: cpu
      target: 70
    - type: memory
      target: 80
```

### Testing Strategy

#### Domain Testing
```typescript
describe('Deployment Aggregate', () => {
  it('should transition states correctly', () => {
    const deployment = new Deployment(validConfig);
    expect(deployment.status).toBe(DeploymentStatus.PENDING);
    
    deployment.execute();
    expect(deployment.status).toBe(DeploymentStatus.IN_PROGRESS);
    
    deployment.complete([mockResult]);
    expect(deployment.status).toBe(DeploymentStatus.COMPLETED);
  });

  it('should emit correct events', () => {
    const deployment = new Deployment(validConfig);
    deployment.execute();
    
    const events = deployment.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(DeploymentStarted);
  });
});
```

#### Integration Testing
```typescript
describe('AWS Pulumi Adapter', () => {
  it('should deploy function successfully', async () => {
    const adapter = new AwsPulumiAdapter();
    const result = await adapter.deployFunction({
      name: 'test-function',
      runtime: Runtime.NODEJS_18,
      handler: 'index.handler',
      memory: 512,
      timeout: 30,
      environment: { ENV: 'test' }
    });

    expect(result.status).toBe('deployed');
    expect(result.endpoint).toMatch(/https:\/\/.*\.execute-api\..*\.amazonaws\.com/);
  });
});
```

### Error Handling

#### Domain Errors
```typescript
export class DeploymentError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DeploymentError';
  }
}

export class ValidationError extends DeploymentError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class ProviderError extends DeploymentError {
  constructor(message: string, public readonly provider: string) {
    super(message, 'PROVIDER_ERROR');
  }
}
```

#### Error Recovery
```typescript
export class DeploymentSaga {
  async handle(event: DeploymentRequested): Promise<void> {
    const deployment = await this.repository.get(event.deploymentId);
    
    try {
      // Execute deployment steps
      await this.deployComponent(deployment);
      await this.configureNetworking(deployment);
      await this.setupMonitoring(deployment);
      
      deployment.complete();
    } catch (error) {
      // Rollback on failure
      await this.rollback(deployment);
      deployment.fail(error);
    }
    
    await this.repository.save(deployment);
  }
}
```

### Security Considerations

1. **Secrets Management**
   - Use AWS Secrets Manager / Azure Key Vault
   - Never store secrets in code or configuration
   - Rotate credentials regularly

2. **IAM Policies**
   - Least privilege principle
   - Separate roles for each component
   - Regular audit of permissions

3. **Network Security**
   - VPC isolation for functions
   - Security groups with minimal rules
   - API Gateway authentication

4. **State Security**
   - Encrypted Pulumi state backend
   - Access control for state files
   - Audit trail for all changes

---

**Design Status**: Complete  
**Review Status**: Pending  
**Last Updated**: Current