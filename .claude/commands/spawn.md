**Purpose**: Multi-agent orchestration with persona-based collaboration

---

@include shared/universal-constants.yml#Universal_Legend

## Command Execution
Execute: immediate. --plan→show plan first
Legend: Generated based on symbols used in command
Purpose: "[Action][Subject] in $ARGUMENTS"

Spawn multiple agents concurrently with different personas, tasks, or both. Enable true parallel execution and multi-perspective analysis.

@include shared/flag-inheritance.yml#Universal_Always

Examples:
- `/spawn --task "implement auth" --persona-backend` - Single agent (traditional)
- `/spawn --batch tasks.yml --coordinate` - Multiple agents, different tasks
- `/spawn --swarm --task "review code" --personas architect,security,qa` - Multi-persona analysis
- `/spawn --matrix feature-matrix.yml --monitor` - Full persona × task matrix

## Spawn Modes

**Single Agent** (Traditional):
- One task, one persona
- Synchronous execution
- Use when waiting for results

**Batch Mode** (--batch):
- Multiple agents, different tasks
- Parallel execution
- Config file driven
- Example: auth-tasks.yml

**Swarm Mode** (--swarm):
- Multiple personas, same task
- Get diverse perspectives
- Automatic conflict resolution
- Example: 3 personas review same code

**Matrix Mode** (--matrix):
- Multiple personas × multiple tasks
- Comprehensive coverage
- Full perspective analysis
- Example: 3 personas × 4 tasks = 12 agents

## Configuration Examples

**Batch Configuration** (tasks.yml):
```yaml
agents:
  - id: auth-api
    task: "Implement authentication endpoints"
    persona: backend
    thinking: think-hard
    mcps: [c7, seq]
    
  - id: auth-ui
    task: "Create login components"
    persona: frontend
    thinking: think
    mcps: [magic, c7]
    
  - id: auth-test
    task: "Write auth tests"
    persona: qa
    thinking: think
    mcps: [pup]
```

**Swarm Example**:
```bash
/spawn --swarm --task "Review database schema" \
       --personas architect,backend,performance,security
       
# Each persona analyzes the same schema:
# - Architect: scalability, patterns
# - Backend: queries, indexes
# - Performance: optimization opportunities
# - Security: access control, encryption
```

**Matrix Configuration** (matrix.yml):
```yaml
tasks:
  - "Design API endpoints"
  - "Implement business logic"
  - "Create UI components"
  - "Write tests"
  
personas: [architect, backend, frontend, qa]
# Creates 16 agents (4×4 matrix)
```

## Coordination & Output

**Inter-Agent Communication** (--coordinate):
- Shared context between agents
- Message passing for dependencies
- Conflict resolution mechanisms
- Progress synchronization

**Output Aggregation** (--aggregate):
```markdown
# Task: Database Schema Review

## Architect Perspective
- Scalability concerns with user table
- Suggests sharding strategy

## Security Perspective  
- Missing encryption for PII
- Recommends field-level encryption

## Performance Perspective
- Index recommendations
- Query optimization tips

## Consensus Recommendations
1. Implement sharding for users
2. Add field encryption
3. Create composite indexes
```

**Progress Monitoring** (--monitor):
```
🚀 Multi-Agent Status

Running: 4/6 agents
├── backend-api: 75% ███████▌  
├── frontend-ui: 45% ████▌     
├── security-audit: 90% █████████ 
└── qa-tests: 20% ██        

Completed: 2/6 agents
✅ architect-design
✅ analyzer-research
```

## Real-World Examples

```bash
# Feature Development Team
/spawn --batch feature-team.yml --coordinate --aggregate
# Spawns: architect, backend, frontend, qa agents

# Security Audit (Multi-Persona)
/spawn --swarm --task "Audit authentication system" \
       --personas security,architect,backend,analyzer \
       --aggregate --think-hard

# Comprehensive Refactoring
/spawn --matrix refactor-plan.yml --dependent --monitor
# Analyzes each module with each persona

# Quick Multi-View Analysis  
/spawn --swarm --task "Should we use GraphQL?" \
       --personas architect,backend,frontend \
       --aggregate --uc
       
# Parallel Documentation
/spawn --batch docs-tasks.yml --parallel
# API docs, user guide, dev guide simultaneously
```

@include shared/multi-agent-patterns.yml#Multi_Agent_System

@include shared/multi-agent-patterns.yml#coordination

@include shared/multi-agent-patterns.yml#output_aggregation

## Best Practices

**When to use Swarm Mode**:
- Need multiple perspectives on same problem
- Critical decisions requiring validation
- Complex code reviews
- Architecture decisions

**When to use Batch Mode**:
- Multiple independent tasks
- Parallel feature development
- Different expertise needed per task
- Want to maximize throughput

**When to use Matrix Mode**:
- Comprehensive analysis needed
- Multiple components to review
- Want all perspectives on all parts
- Quality gates before release

@include shared/universal-constants.yml#Standard_Messages_Templates