# WebBuddy → Semantest Migration Quick Start

## 🚀 Essential Commands (2 minutes to learn)

### 1. Preview Changes (--dry-run)
```bash
# See what will change WITHOUT modifying files
./migrate-buddy.sh --dry-run

# Example output:
# [DRY RUN] Would replace 892 simple occurrences
# [DRY RUN] Would update 1,143 context-aware references
# [DRY RUN] Files to modify: 164
# [DRY RUN] No changes made - preview only
```

### 2. Simple Pattern Migration (--pattern simple)
```bash
# Replace only simple, safe patterns first
./migrate-buddy.sh --pattern simple

# This ONLY replaces:
# - @web-buddy/* → @semantest/*
# - "web-buddy" → "semantest" (in quotes)
# - /web-buddy/ → /semantest/ (in paths)

# Safe for immediate use - no breaking changes!
```

### 3. Rollback Changes (--rollback)
```bash
# Instant rollback to previous state
./migrate-buddy.sh --rollback

# Restores from automatic backup
# Takes < 30 seconds
# Zero data loss guaranteed
```

## 🎯 Complete Example Workflow

```bash
# STEP 1: Preview what will change
./migrate-buddy.sh --dry-run > migration-preview.txt

# STEP 2: Migrate simple patterns only
./migrate-buddy.sh --pattern simple

# STEP 3: Test your application
npm test

# STEP 4: If tests pass, do full migration
./migrate-buddy.sh --pattern all

# STEP 5: If issues, rollback immediately
./migrate-buddy.sh --rollback
```

## ⚡ One-Liner Examples

```bash
# Conservative approach (config files only)
./migrate-buddy.sh --pattern simple --files "*.json"

# Preview TypeScript changes
./migrate-buddy.sh --dry-run --files "*.ts"

# Full migration with backup
./migrate-buddy.sh --backup --pattern all

# Emergency rollback
./migrate-buddy.sh --rollback --force
```

## 🆘 Quick Troubleshooting

**Tests failing?**
```bash
./migrate-buddy.sh --rollback
./migrate-buddy.sh --pattern simple --exclude test/
```

**Need specific files only?**
```bash
./migrate-buddy.sh --files "package.json,manifest.json"
```

**Want to see verbose output?**
```bash
./migrate-buddy.sh --dry-run --verbose
```

---
**Time to migrate**: 5-10 minutes  
**Time to rollback**: < 30 seconds  
**Support**: migration-help@semantest.com