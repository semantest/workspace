# Contributing to Semantest

Thank you for your interest in contributing to Semantest! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Process](#development-process)
4. [Commit Message Format](#commit-message-format)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Pull Request Process](#pull-request-process)
8. [Issue Guidelines](#issue-guidelines)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully
- Prioritize the community's best interests

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Chrome browser (for extension development)
- TypeScript knowledge
- Familiarity with event-driven architecture

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/semantest.git
   cd semantest
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```

## Development Process

### 1. Test-Driven Development (TDD)

We follow strict TDD practices. Always write tests before implementation:

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code quality

### 2. Event-Driven Architecture

All features must follow our event-driven patterns:
- Extend TypeScript-EDA base classes
- Use proper event types with correlation IDs
- Maintain clean separation of concerns

## Commit Message Format

We use TDD-emoji format for all commit messages to clearly indicate the development phase:

### Format

```
<emoji> <type>: <subject>

<body>

<footer>
```

### Emojis and Their Meanings

| Emoji | Meaning | Use Case |
|-------|---------|----------|
| 🧪 | Test | Writing new tests (Red phase) |
| ✅ | Pass | Making tests pass (Green phase) |
| 🚀 | Refactor | Improving code quality |
| 📝 | Docs | Documentation updates |
| 🐛 | Fix | Bug fixes |
| ✨ | Feature | New features (after TDD cycle) |
| 🎨 | Style | Code formatting, no logic change |
| ⚡ | Perf | Performance improvements |
| 🔧 | Config | Configuration changes |
| 📦 | Deps | Dependency updates |
| 🔒 | Security | Security improvements |
| 🌐 | I18n | Internationalization |
| ♿ | A11y | Accessibility improvements |
| 🚧 | WIP | Work in progress |
| 🔥 | Remove | Removing code/files |
| 🎉 | Init | Initial commit |
| 🔖 | Release | Version tags |
| 🚨 | Lint | Fixing linter warnings |
| 💚 | CI | Fixing CI builds |
| ⬆️ | Upgrade | Upgrading dependencies |
| ⬇️ | Downgrade | Downgrading dependencies |
| 📌 | Pin | Pinning dependencies |
| 👷 | CI | Adding CI build system |
| 📈 | Analytics | Adding analytics |
| ➕ | Add | Adding a dependency |
| ➖ | Remove | Removing a dependency |
| 🔊 | Logs | Adding logs |
| 🔇 | Logs | Removing logs |
| 👥 | Contributors | Adding contributors |
| 🚚 | Move | Moving/renaming files |
| 📄 | License | License updates |
| 💥 | Breaking | Breaking changes |
| 🍱 | Assets | Adding/updating assets |
| ♻️ | Refactor | Code refactoring |
| 🥚 | Easter Egg | Adding easter eggs |
| 📸 | Screenshots | Adding/updating screenshots |
| 🙈 | Gitignore | Adding/updating .gitignore |

### Examples

#### TDD Cycle Example

```bash
# Red phase - Write failing test
git commit -m "🧪 test: Add test for Google Images URL resolution

Expecting high-resolution URL extraction from thumbnail"

# Green phase - Make test pass
git commit -m "✅ feat: Implement basic URL resolution for Google Images

Extracts URL from data attributes"

# Refactor phase - Improve implementation
git commit -m "🚀 refactor: Extract URL resolution strategies to separate methods

Improves maintainability and testability"
```

#### Other Examples

```bash
# Documentation
git commit -m "📝 docs: Add Google Images download user guide

Comprehensive guide with examples and troubleshooting"

# Bug fix
git commit -m "🐛 fix: Resolve timeout issue in image download

Increases timeout and adds retry logic for large files"

# Performance
git commit -m "⚡ perf: Optimize DOM scanning with IntersectionObserver

Reduces CPU usage by 80% during scrolling"

# Configuration
git commit -m "🔧 config: Add Google Images to Chrome manifest permissions

Required for content script injection"
```

### Commit Message Rules

1. **Use present tense**: "Add feature" not "Added feature"
2. **Use imperative mood**: "Move cursor to..." not "Moves cursor to..."
3. **Limit subject to 50 characters**
4. **Separate subject from body with blank line**
5. **Wrap body at 72 characters**
6. **Explain what and why in body, not how**

## Coding Standards

### TypeScript

- Use strict mode
- Explicit types (avoid `any`)
- Interfaces for data structures
- Proper error handling
- JSDoc comments for public APIs

### Architecture

- Follow Domain-Driven Design
- Maintain clear boundaries
- Use dependency injection
- Keep infrastructure separate from domain

### Example

```typescript
/**
 * Downloads an image from Google Images search results
 * 
 * @param query - The search query
 * @returns Download result with file details
 */
export async function downloadImage(query: string): Promise<DownloadResult> {
    // Implementation following our patterns
}
```

## Testing Requirements

### Test Coverage

- Minimum 80% code coverage
- 100% coverage for critical paths
- Unit tests for all public methods
- Integration tests for workflows

### Test Structure

```typescript
describe('GoogleImagesDownloader', () => {
    describe('URL Resolution', () => {
        it('should extract high-resolution URL from thumbnail', async () => {
            // Arrange
            const thumbnail = createMockThumbnail();
            
            // Act
            const url = await downloader.resolveUrl(thumbnail);
            
            // Assert
            expect(url).toBe('https://example.com/full-res.jpg');
        });
    });
});
```

## Pull Request Process

1. **Create feature branch**: `feature/google-images-batch-download`
2. **Follow TDD**: Commit history should show red-green-refactor
3. **Update documentation**: Include relevant docs updates
4. **Pass all checks**: Tests, linting, build
5. **Request review**: From at least one maintainer
6. **Address feedback**: Make requested changes
7. **Squash if needed**: Clean up commit history

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Issue Guidelines

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Environment details

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative considered
- Additional context

### Good First Issues

Look for issues labeled:
- `good first issue`
- `help wanted`
- `documentation`

## Development Tips

### Local Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- google-images-downloader.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Debugging

1. Use Chrome DevTools for extension debugging
2. Enable verbose logging with `DEBUG=semantest:*`
3. Check correlation IDs for event tracking

### Performance

- Profile before optimizing
- Use Chrome Performance tab
- Monitor memory usage
- Test with large datasets

## Questions?

- Check existing issues first
- Ask in Discord: [Join our community](https://discord.gg/semantest)
- Email maintainers: contribute@semantest.com

Thank you for contributing to Semantest! Your efforts help make web automation accessible to everyone. 🎉