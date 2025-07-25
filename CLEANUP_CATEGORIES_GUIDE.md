# Documentation Cleanup Categories Guide

## For Sam - Document Organization Structure

### Suggested Directory Structure:

```
/docs/
├── architecture/          # System design, technical specs
├── post-mortems/         # Crisis analysis (WebSocket incident)
├── status-reports/       # Daily updates, progress reports
├── urgent-messages/      # Emergency alerts, blockers
├── team-updates/         # Team communications, celebrations
├── git-reminders/        # Git commit reminders
├── task-tracking/        # PM task updates, todo lists
├── requirements/         # REQ-001, REQ-002, etc.
├── guides/              # How-to documents, setup guides
└── meeting-notes/       # Team discussions, decisions
```

### WebSocket Crisis Subfolder:
`/docs/post-mortems/websocket-crisis-2025-01-25/`
- All 40+ emergency documents from today
- Timeline documents (2_HOUR_DISASTER_MILESTONE.md, etc.)
- MIRACLE_AT_2_59_49.md
- Final resolutions

### Files to Keep in Root:
- README.md
- CLAUDE.md
- STORY.md
- JOURNAL.md
- LICENSE
- Configuration files (*.json, *.yml)
- Active working documents

### Naming Conventions:
- Use dates: YYYY-MM-DD-description.md
- Keep prefixes: URGENT_, CRITICAL_, PM_, TEAM_
- Maintain chronological order within folders

This organization will make the project much more navigable!