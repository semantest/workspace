# Updated Architecture Guidance - PythonEDA Framework Integration

## Incorporating PythonEDA for Infrastructure as Code

### Understanding PythonEDA Framework
Since rydnr mentioned using the PythonEDA framework (same as licdata-iac), this changes our approach significantly. PythonEDA is an event-driven architecture framework that would bring consistency between our application and infrastructure layers.

### Revised Architecture with PythonEDA

#### 1. Event-Driven Infrastructure Structure
```
semantest-infrastructure/
├── semantest_iac/
│   ├── events/                    # Infrastructure events
│   │   ├── deployment_requested.py
│   │   ├── function_deployed.py
│   │   ├── scaling_triggered.py
│   │   └── infrastructure_updated.py
│   ├── domain/                    # Domain layer
│   │   ├── deployment/
│   │   │   ├── deployment_aggregate.py
│   │   │   └── deployment_service.py
│   │   ├── compute/
│   │   │   ├── serverless_function.py
│   │   │   └── container_service.py
│   │   └── networking/
│   │       ├── api_gateway.py
│   │       └── load_balancer.py
│   ├── application/               # Application services
│   │   ├── deploy_rest_api_handler.py
│   │   ├── deploy_websocket_handler.py
│   │   └── configure_environment_handler.py
│   └── infrastructure/            # Infrastructure adapters
│       ├── pulumi/
│       │   ├── aws_adapter.py
│       │   └── azure_adapter.py
│       └── event_bus/
│           └── infrastructure_event_bus.py
```

#### 2. PythonEDA Event-Driven Approach

**Infrastructure Events**
```python
# events/deployment_requested.py
from pythoneda import Event, DomainEvent

@Event
class DeploymentRequested(DomainEvent):
    def __init__(self, 
                 component: str,
                 provider: str,
                 environment: str,
                 configuration: dict):
        super().__init__()
        self.component = component
        self.provider = provider
        self.environment = environment
        self.configuration = configuration

# events/function_deployed.py
@Event
class FunctionDeployed(DomainEvent):
    def __init__(self,
                 function_name: str,
                 arn: str,
                 endpoint: str):
        super().__init__()
        self.function_name = function_name
        self.arn = arn
        self.endpoint = endpoint
```

**Event Handlers**
```python
# application/deploy_rest_api_handler.py
from pythoneda import EventHandler, listen
from semantest_iac.events import DeploymentRequested, FunctionDeployed
from semantest_iac.domain.deployment import DeploymentService

@EventHandler
class DeployRestApiHandler:
    def __init__(self, deployment_service: DeploymentService):
        self.deployment_service = deployment_service
    
    @listen(DeploymentRequested)
    async def handle_deployment_request(self, event: DeploymentRequested):
        if event.component == "rest-api":
            # Deploy REST API using domain service
            result = await self.deployment_service.deploy_rest_api(
                provider=event.provider,
                environment=event.environment,
                config=event.configuration
            )
            
            # Publish completion event
            await self.publish(FunctionDeployed(
                function_name=result.name,
                arn=result.arn,
                endpoint=result.endpoint
            ))
```

#### 3. Integration with Semantest's Event-Driven Architecture

**Cross-Domain Event Flow**
```python
# infrastructure/event_bus/infrastructure_event_bus.py
from pythoneda import EventBus
from semantest_core.events import ServiceDeploymentNeeded

class InfrastructureEventBus(EventBus):
    """Bridges application and infrastructure events"""
    
    @listen(ServiceDeploymentNeeded)
    async def handle_service_deployment(self, event: ServiceDeploymentNeeded):
        # Transform application event to infrastructure event
        deployment_request = DeploymentRequested(
            component=event.service_type,
            provider=self.get_provider_for_environment(event.environment),
            environment=event.environment,
            configuration=event.service_config
        )
        await self.publish(deployment_request)
```

### Alternative: TypeScript/JavaScript Approach

If we decide NOT to use Python/PythonEDA, here's a TypeScript approach that maintains DDD + Hexagonal + Event-Driven:

```typescript
// src/domain/events/DeploymentRequested.ts
export class DeploymentRequested {
  constructor(
    public readonly component: string,
    public readonly provider: 'aws' | 'azure',
    public readonly environment: string,
    public readonly configuration: Record<string, any>
  ) {}
}

// src/application/handlers/DeployRestApiHandler.ts
import { EventHandler } from '@semantest/core';
import { DeploymentRequested, FunctionDeployed } from '../domain/events';

@EventHandler(DeploymentRequested)
export class DeployRestApiHandler {
  constructor(
    private deploymentService: DeploymentService,
    private pulumiAdapter: PulumiAdapter
  ) {}

  async handle(event: DeploymentRequested): Promise<void> {
    if (event.component === 'rest-api') {
      const stack = await this.pulumiAdapter.createStack(event);
      const result = await stack.up();
      
      await this.eventBus.publish(new FunctionDeployed({
        functionName: result.outputs.functionName,
        endpoint: result.outputs.apiEndpoint
      }));
    }
  }
}
```

### Recommendations for Dana

1. **If using PythonEDA**:
   - Study the licdata-iac implementation for patterns
   - Leverage PythonEDA's event-driven capabilities
   - Maintain event compatibility with Semantest core

2. **If using TypeScript**:
   - Use Pulumi's TypeScript SDK
   - Implement similar event-driven patterns
   - Consider using our existing message bus

3. **Either way**:
   - Keep infrastructure events separate from domain events
   - Use adapters for cloud provider abstraction
   - Implement proper event sourcing for infrastructure changes

### CLI Integration

```bash
# Using PythonEDA approach
python -m semantest_iac deploy --component rest-api --provider aws

# Using TypeScript approach  
npx semantest-iac deploy --component websocket --provider azure

# Or through Pulumi with our wrapper
pulumi up -s production -c semantest:component=rest-api
```

---

**Time**: 4:20 AM
**Architecture Guidance**: Updated with PythonEDA context
**Flexibility**: Both Python and TypeScript approaches provided
**Aria**: Adapting guidance after 30+ hours!