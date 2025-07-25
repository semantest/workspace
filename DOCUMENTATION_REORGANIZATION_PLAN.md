# Documentation Reorganization Plan

## Current Situation
- **Total files**: 317 markdown files in root directory
- **Status/Report files**: 64 time-based and status documents
- **Mixed content**: Agent messages, feature docs, architecture notes, urgent alerts

## Directory Structure

### 1. Core Documentation (remain in root)
- README.md
- CLAUDE.md
- LICENSE
- CHANGELOG.md
- CONTRIBUTING.md
- QUICK_START.md
- INSTALLATION_GUIDE.md
- JOURNAL.md
- JOURNAL_CONSOLIDATED.md
- STORY.md
- project_spec.md

### 2. New Directory Structure

```
docs/
├── architecture/           # Technical decisions and system design
├── status-reports/        # Time-based milestone and status reports
├── team-updates/          # Agent messages and accountability reports
├── features/              # Feature documentation
├── testing/               # Test plans and validation reports
├── security/              # Security frameworks and audits
├── deployment/            # Deployment guides and configs
├── workflows/             # Workflow updates and guides
├── beta/                  # Beta program documentation
├── compliance/            # Compliance and enterprise docs
├── vision/                # Project vision and roadmaps
└── archive/               # Old/completed items

```

## Categorization Plan

### docs/status-reports/
- All MILESTONE_*.md files
- All *_HOUR_*.md files
- All ACCOUNTABILITY_*.md files
- All STATUS_REPORT*.md files
- All PROGRESS_VALIDATION_*.md files
- All WORKFLOW-UPDATE-*.md files
- Time-based updates (e.g., 2_5_HOUR_STATUS_REPORT.md)

### docs/team-updates/
- Agent-specific messages (ALEX_*, DANA_*, EVA_*, QUINN_*, SAM_*)
- PM_*.md files
- TEAM_*.md files
- URGENT_*.md files
- COLLABORATION_CHECK_*.md files
- MANAGEMENT_CHECK_*.md files

### docs/architecture/
- ARCHITECTURAL_*.md files
- ARCHITECTURE-*.md files
- *_ARCHITECTURE*.md files
- Design and system documents

### docs/features/
- WebSocket-related docs (WEBSOCKET_*.md)
- Extension-related docs (EXTENSION_*.md, CHROME_*.md)
- Feature implementation docs
- SDK documentation

### docs/testing/
- All *_TEST_*.md files
- QA_*.md files
- TESTING_*.md files
- Validation reports

### docs/security/
- SECURITY_*.md files
- *_SECURITY_*.md files
- GPG_*.md files
- ZERO_TRUST_*.md files
- Security audit files

### docs/deployment/
- DEPLOYMENT_*.md files
- BUILD_*.md files
- Docker and deployment configs
- CI/CD documentation

### docs/beta/
- BETA_*.md files
- User guides and feedback docs

### docs/compliance/
- COMPLIANCE_*.md files
- ENTERPRISE_*.md files
- FORTUNE_500_*.md files
- Privacy and terms documents

### docs/vision/
- ROADMAP*.md files
- Vision documents
- Creative revolution docs

### docs/workflows/
- Workflow guides
- Communication protocols
- Team collaboration docs

### docs/archive/
- Completed milestones
- Old status reports
- Resolved urgent issues

## Execution Steps

1. Create directory structure
2. Move files to appropriate directories
3. Update any references in remaining root files
4. Create index files for each directory
5. Update README.md with new documentation structure

## Files to Keep in Root
- README.md
- CLAUDE.md
- LICENSE
- CHANGELOG.md
- CONTRIBUTING.md
- QUICK_START.md
- INSTALLATION_GUIDE.md
- JOURNAL.md
- JOURNAL_CONSOLIDATED.md
- STORY.md
- project_spec.md
- Package files (package.json, lerna.json, tsconfig.json)
- Docker files
- Script files (.sh)
- Configuration files

This reorganization will reduce root directory files from 317 to approximately 20-30 essential files.