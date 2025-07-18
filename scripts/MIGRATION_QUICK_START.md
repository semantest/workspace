# Semantest → Semantest Migration Quick Start

## 🚀 Essential Commands (2 minutes to learn)

### 1. Preview Changes (--dry-run)
```bash
# See what will change WITHOUT modifying files
./migrate-semantest.sh --dry-run

# Example output:
# [DRY RUN] Would replace 892 simple occurrences
# [DRY RUN] Would update 1,143 context-aware references
# [DRY RUN] Files to modify: 164
# [DRY RUN] No changes made - preview only
```

### 2. Simple Pattern Migration (--pattern simple)
```bash
# Replace only simple, safe patterns first
./migrate-semantest.sh --pattern simple

# This ONLY replaces:
# - @semantest/* → @semantest/*
# - "semantest" → "semantest" (in quotes)
# - /semantest/ → /semantest/ (in paths)

# Safe for immediate use - no breaking changes!
```

### 3. Rollback Changes (--rollback)
```bash
# Instant rollback to previous state
./migrate-semantest.sh --rollback

# Restores from automatic backup
# Takes < 30 seconds
# Zero data loss guaranteed
```

## 🎯 Complete Example Workflow

```bash
# STEP 1: Preview what will change
./migrate-semantest.sh --dry-run > migration-preview.txt

# STEP 2: Migrate simple patterns only
./migrate-semantest.sh --pattern simple

# STEP 3: Test your application
npm test

# STEP 4: If tests pass, do full migration
./migrate-semantest.sh --pattern all

# STEP 5: If issues, rollback immediately
./migrate-semantest.sh --rollback
```

## ⚡ One-Liner Examples

```bash
# Conservative approach (config files only)
./migrate-semantest.sh --pattern simple --files "*.json"

# Preview TypeScript changes
./migrate-semantest.sh --dry-run --files "*.ts"

# Full migration with backup
./migrate-semantest.sh --backup --pattern all

# Emergency rollback
./migrate-semantest.sh --rollback --force
```

## 🆘 Quick Troubleshooting

**Tests failing?**
```bash
./migrate-semantest.sh --rollback
./migrate-semantest.sh --pattern simple --exclude test/
```

**Need specific files only?**
```bash
./migrate-semantest.sh --files "package.json,manifest.json"
```

**Want to see verbose output?**
```bash
./migrate-semantest.sh --dry-run --verbose
```

---
**Time to migrate**: 5-10 minutes  
**Time to rollback**: < 30 seconds  
**Support**: migration-help@semantest.com