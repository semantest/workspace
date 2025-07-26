# Semantest Team Sub-Agents

This directory contains Claude Code sub-agent definitions that mirror our tmux-orchestrator team members. These sub-agents provide specialized expertise and maintain consistent personalities across sessions.

## Available Sub-Agents

### Development Team
- **alex-backend** - Pragmatic backend developer (APIs, WebSocket, databases)
- **eva-frontend** - Creative frontend developer (Chrome extension, UI/UX)
- **aria-architect** - Strategic system architect (design patterns, technical decisions)

### Quality & Operations
- **quinn-qa** - Thorough QA engineer (testing, edge cases, quality assurance)
- **dana-devops** - Analytical DevOps engineer (infrastructure, deployment, automation)

### Documentation
- **sam-scribe** - Meticulous documentation specialist (guides, API docs, team chronicle)

## How to Use Sub-Agents

### Method 1: Automatic Delegation
Claude Code will automatically delegate tasks based on the description:
```
"Create API endpoints for image queue management"  → alex-backend
"Update the Chrome extension UI for download status" → eva-frontend
"Review the system architecture for scalability" → aria-architect
```

### Method 2: Explicit Invocation
Mention the sub-agent directly:
```
"Ask @alex-backend to implement the WebSocket server"
"Have @eva-frontend create the download queue UI"
"Get @aria-architect to review our API design"
```

### Method 3: Command Invocation
Use the `/agent` command:
```
/agent alex-backend Implement the image download queue with proper error handling
```

## Sub-Agent Integration with Tmux Orchestrator

These sub-agents are designed to mirror our tmux team members:

1. **Consistent Personalities**: Each sub-agent has the same personality as their tmux counterpart
2. **Specialized Expertise**: Focused on their domain area
3. **Team Awareness**: They understand the broader team context
4. **TDD Commitment**: All follow our emoji commit conventions

## Benefits of Using Sub-Agents

1. **Context Preservation**: Main conversation stays clean
2. **Specialized Expertise**: Each agent is optimized for their domain
3. **Parallel Work**: Can delegate multiple tasks simultaneously
4. **Consistent Behavior**: Same personality and approach across sessions

## Creating New Sub-Agents

To add a new team member:

1. Create a new `.md` file in this directory
2. Add YAML frontmatter with name, description, and tools
3. Write a detailed system prompt covering:
   - Identity and personality
   - Expertise areas
   - Key behaviors
   - Project context
   - Communication style

## Best Practices

1. **Use for Focused Tasks**: Sub-agents excel at domain-specific work
2. **Provide Context**: Include relevant project details in your request
3. **Chain for Complex Work**: Combine multiple sub-agents for comprehensive solutions
4. **Review Output**: Sub-agents work independently, so review their integration points

## Example Workflow

```bash
# 1. Backend API design
"Ask @alex-backend to design the image queue API endpoints"

# 2. Frontend implementation  
"Have @eva-frontend create the UI components for the queue"

# 3. Architecture review
"Get @aria-architect to review the integration approach"

# 4. Testing strategy
"Ask @quinn-qa to create test cases for the image queue feature"

# 5. Documentation
"Have @sam-scribe document the API and user workflow"
```

## Tmux Integration Note

While these sub-agents operate within Claude Code, they maintain the same identities as our tmux-orchestrator agents. This provides consistency whether you're working directly in Claude Code or through the tmux sessions.

---

*These sub-agents are part of the Semantest project's commitment to specialized, personality-driven development.*