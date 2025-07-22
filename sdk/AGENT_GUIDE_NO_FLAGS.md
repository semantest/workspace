# Agent Guide: Working Without MCP Flags

## 🚨 IMPORTANT: Your claude v1.0.57 does NOT support flags!

### ❌ These Commands Will NOT Work:
```bash
claude --think-hard "analyze code"     # ERROR!
claude --delegate "multi-file review"  # ERROR!
claude --magic "create UI"             # ERROR!
claude --uc "explain concept"          # ERROR!
```

### ✅ These Commands WILL Work:

#### For Backend Engineers:
```bash
# Complex analysis (no --think-hard needed):
claude "Analyze the WebSocket server architecture for security vulnerabilities, performance bottlenecks, and scalability issues. Provide specific code improvements."

# Multi-file review (no --delegate needed):
claude "Review all files in the server/src directory for authentication implementation. Check auth.ts, middleware.ts, and validate.ts."
```

#### For Frontend Engineer:
```bash
# UI components (no --magic needed):
claude "Create a React component for image upload with: drag-and-drop support, file validation, progress tracking, error handling, and TypeScript types."

# Optimization (no --uc needed):
claude "Build efficient image gallery component with lazy loading"
```

#### For QA Engineer:
```bash
# Testing (no --play needed):
claude "Write Playwright E2E tests for the image upload feature including: file selection, upload progress, success handling, and error cases."

# Analysis:
claude "Review test coverage and identify missing test scenarios"
```

## 💡 Token Optimization Strategies (No --uc Flag)

### 1. Combine Related Requests:
```bash
# Instead of:
claude "What is JWT?"
claude "How to implement JWT?"
claude "JWT security best practices?"

# Do this:
claude "Explain JWT authentication: concept, implementation steps, and security best practices for our WebSocket server"
```

### 2. Be Specific and Direct:
```bash
# Vague (wastes tokens):
claude "Help with security"

# Specific (saves tokens):
claude "Add rate limiting to WebSocket connections in server.ts"
```

### 3. Reference Previous Context:
```bash
# First query:
claude "Review auth implementation in server.ts"

# Follow-up:
claude "Based on the auth review above, implement the suggested improvements"
```

## 🎯 Effective Prompts Without Flags

### Complex Tasks (replacing --think-hard):
"Perform a comprehensive analysis of [topic]. Break down into: 1) Current state assessment, 2) Problem identification, 3) Root cause analysis, 4) Recommended solutions with code examples."

### Multi-Agent Work (replacing --delegate):
"Review all [type] files in [directory]. For each file: identify issues, suggest improvements, and provide refactored code snippets."

### UI Creation (replacing --magic):
"Create a modern, accessible React component for [purpose] with: proper TypeScript types, hooks implementation, error boundaries, loading states, and responsive design."

### Concise Responses (replacing --uc):
"Briefly explain [topic] with a focus on practical implementation"
"Summarize the key points of [concept] in 3-5 bullet points"

## 📊 Remember: Quality Over Flags

Your work quality matters more than the tools. Focus on:
1. Understanding the requirement fully
2. Providing complete solutions
3. Writing clean, tested code
4. Clear communication

The absence of flags doesn't limit your ability to deliver excellent work!