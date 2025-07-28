# 🚨 TDD Emoji Commit System + GPG Signing

## MANDATORY Requirements
1. **GPG Sign ALL Commits**: `git commit -S`
2. **Use TDD Emojis**: When feasible, include in commit messages
3. **Update GitHub Issues**: Reference issues in commits

## TDD Emoji System

### 💡 Idea Defined/Planned
```bash
git commit -S -m "💡 feat(#597): plan image download flow

- Define download request event structure
- Plan queue management approach
- Outline error handling strategy"
```

### 🧪 New Failing Test
```bash
git commit -S -m "🧪 test(#597): add failing test for download handler

- Test expects image download to specified folder
- Currently fails as handler not implemented"
```

### 🍬 Naive Implementation
```bash
git commit -S -m "🍬 feat(#597): naive download implementation

- Basic download without error handling
- No queue management yet
- Makes test pass"
```

### 🚧 Working Implementation
```bash
git commit -S -m "🚧 feat(#597): working download with queue

- Add proper queue management
- Implement retry logic
- Handle edge cases"
```

### 🚀 Refactor
```bash
git commit -S -m "🚀 refactor(#597): optimize download performance

- Extract download logic to separate module
- Add caching layer
- Improve error messages"
```

### 📝 Journal Updated
```bash
git commit -S -m "📝 docs(#597): update journal with download flow

- Document implementation decisions
- Add architecture diagrams
- Update API documentation"
```

### 🏅 Task Documented
```bash
git commit -S -m "🏅 docs(#597): complete download task documentation

- Add usage examples
- Document configuration options
- Update README"
```

## Example Complete Flow

```bash
# 1. Plan the feature
git commit -S -m "💡 feat(#597): plan image download handler"

# 2. Write the test
git commit -S -m "🧪 test(#597): download handler should save to folder"

# 3. Quick implementation
git commit -S -m "🍬 feat(#597): basic download functionality"

# 4. Make it production-ready
git commit -S -m "🚧 feat(#597): add queue and error handling"

# 5. Clean it up
git commit -S -m "🚀 refactor(#597): extract download service"

# 6. Document progress
git commit -S -m "📝 docs: update journal with download implementation"

# 7. Complete documentation
git commit -S -m "🏅 docs: finalize download feature documentation"
```

## Combined Example (Multiple Emojis)
```bash
git commit -S -m "🚧🚀 feat(#597): implement and refactor download flow

- Working implementation with queue management
- Refactored for better separation of concerns
- All tests passing

Co-authored-by: Team Member <email>"
```

## Important Notes
- Not every commit needs emojis (hotfixes, typos, etc.)
- Focus on significant development steps
- ALWAYS use GPG signing (-S flag)
- Reference GitHub issues when relevant
- Be descriptive in commit messages

## WebSocket Handler Update Status
✅ Already implemented in latest code:
- `handleDownloadCompleted()` method
- `sendDownloadRequest()` method
- Event subscriptions for download events
- Chrome notifications on completion

---
Generated: 2025-07-25 | After 597 workflow checks, we have REAL work!