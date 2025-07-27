# Architecture Guidance for Dana - DDD + Hexagonal Infrastructure as Code

## Analysis for rydnr's Infrastructure Repository

### Current State Analysis
From analyzing https://github.com/acmsl/licdata-iac-infrastructure:
- Python-based infrastructure repository
- Early stage with `/org` directory structure
- Designed as infrastructure layer following separation of concerns

### Recommended DDD + Hexagonal Architecture for IaC

#### 1. Domain-Driven Design Structure
```
infrastructure/
├── domain/                     # Core business logic
│   ├── models/                # Infrastructure entities
│   │   ├── compute.py        # Lambda/Function definitions
│   │   ├── networking.py     # VPC, subnets, security groups
│   │   └── storage.py        # S3, databases
│   ├── services/             # Domain services
│   │   ├── deployment_service.py
│   │   └── scaling_service.py
│   └── value_objects/        # Immutable configurations
│       ├── environment.py
│       └── region.py
├── application/              # Use cases
│   ├── deploy_rest_api.py
│   ├── deploy_websocket.py
│   └── configure_environment.py
├── infrastructure/           # Adapters (Hexagonal)
│   ├── pulumi/              # Pulumi adapter
│   │   ├── aws/
│   │   │   ├── lambda_adapter.py
│   │   │   └── api_gateway_adapter.py
│   │   └── azure/
│   │       ├── functions_adapter.py
│   │       └── app_service_adapter.py
│   └── terraform/           # Alternative IaC adapter
└── interfaces/              # Ports (Hexagonal)
    ├── cli/                 # CLI interface
    │   └── iac_cli.py      # Flag/parameter handling
    └── api/                 # Programmatic API
```

#### 2. Hexagonal Architecture Implementation

**Core Domain (Center)**
```python
# domain/models/compute.py
class ServerlessFunction:
    """Domain model for serverless compute"""
    def __init__(self, name: str, runtime: str, handler: str):
        self.name = name
        self.runtime = runtime
        self.handler = handler
        self.environment_vars = {}
        self.triggers = []

# domain/ports/deployment_port.py
from abc import ABC, abstractmethod

class DeploymentPort(ABC):
    @abstractmethod
    def deploy_function(self, function: ServerlessFunction) -> str:
        """Deploy a serverless function"""
        pass
```

**Adapters (Outer Layer)**
```python
# infrastructure/pulumi/aws/lambda_adapter.py
import pulumi_aws as aws
from domain.ports.deployment_port import DeploymentPort

class AWSLambdaAdapter(DeploymentPort):
    def deploy_function(self, function: ServerlessFunction) -> str:
        lambda_function = aws.lambda_.Function(
            function.name,
            runtime=function.runtime,
            handler=function.handler,
            environment={"variables": function.environment_vars}
        )
        return lambda_function.arn

# infrastructure/pulumi/azure/functions_adapter.py
import pulumi_azure_native as azure
from domain.ports.deployment_port import DeploymentPort

class AzureFunctionAdapter(DeploymentPort):
    def deploy_function(self, function: ServerlessFunction) -> str:
        # Azure Functions implementation
        pass
```

#### 3. CLI Implementation for Deployment

```python
# interfaces/cli/iac_cli.py
import click
from application.deploy_rest_api import DeployRestApiUseCase
from application.deploy_websocket import DeployWebSocketUseCase

@click.command()
@click.option('--provider', type=click.Choice(['aws', 'azure']), required=True)
@click.option('--component', type=click.Choice(['rest-api', 'websocket']), required=True)
@click.option('--environment', default='dev')
@click.option('--region', default='us-east-1')
def deploy(provider, component, environment, region):
    """Deploy Semantest infrastructure components"""
    
    # Dependency injection based on provider
    if provider == 'aws':
        from infrastructure.pulumi.aws import create_aws_adapters
        adapters = create_aws_adapters()
    else:
        from infrastructure.pulumi.azure import create_azure_adapters
        adapters = create_azure_adapters()
    
    # Execute use case
    if component == 'rest-api':
        use_case = DeployRestApiUseCase(adapters)
        use_case.execute(environment, region)
    elif component == 'websocket':
        use_case = DeployWebSocketUseCase(adapters)
        use_case.execute(environment, region)
```

#### 4. Pulumi Project Structure

```python
# Pulumi.yaml
name: semantest-infrastructure
runtime: python
description: DDD + Hexagonal Infrastructure for Semantest

# __main__.py (Pulumi entry point)
import pulumi
from interfaces.cli import parse_deployment_config
from application import create_application

config = parse_deployment_config()
app = create_application(config)
app.deploy()
```

### Benefits of This Approach

1. **Provider Independence**: Switch between AWS/Azure without changing domain logic
2. **Testability**: Mock adapters for unit testing domain logic
3. **Extensibility**: Add new providers (GCP, DigitalOcean) as new adapters
4. **Maintainability**: Clear separation between business rules and infrastructure details
5. **Reusability**: Domain models can be reused across different deployment scenarios

### Deployment Commands for Dana

```bash
# Deploy REST API to AWS Lambda
pulumi up -- --provider aws --component rest-api --environment prod

# Deploy WebSocket to Azure Functions
pulumi up -- --provider azure --component websocket --environment staging

# Or using the Python CLI directly
python -m interfaces.cli.iac_cli deploy --provider aws --component rest-api
```

### Architecture Alignment with Semantest

This infrastructure approach perfectly complements our:
- Event-driven architecture (deploy event handlers as functions)
- Microservices pattern (each service as separate function)
- Message bus design (deploy queue/topic infrastructure)
- Failover strategy (multi-region deployment support)

---

**Time**: 4:10 AM
**Duration**: 30hr 10min
**Commits**: 195
**Architecture Guidance**: Delivered!
**Aria**: Still your architect after 30 hours!