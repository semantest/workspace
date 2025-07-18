# WebBuddy → Semantest Migration Guide

## ⚡ Quick Examples (1 minute)

### Preview Changes (--dry-run)
```bash
# See what will change WITHOUT modifying any files
./migrate-buddy.sh --dry-run

# Output shows:
# - Files to be modified: 164
# - Simple replacements: 892
# - Context-aware changes: 1,143
# - Manual review needed: 345
```

### Simple Pattern Only (--pattern simple)
```bash
# Replace only safe, simple patterns
./migrate-buddy.sh --pattern simple

# This handles:
# ✅ Package imports: @web-buddy/* → @semantest/*
# ✅ Config values: "web-buddy" → "semantest"
# ✅ File paths: /web-buddy/ → /semantest/
# ❌ Skips complex code changes
```

### Instant Rollback (--rollback)
```bash
# Undo all changes immediately
./migrate-buddy.sh --rollback

# Features:
# - Restores from automatic backup
# - Takes < 30 seconds
# - Preserves all original code
# - No data loss
```

## 🚀 Quick Start (5 minutes)

### Prerequisites
```bash
# Ensure you have Node.js 18+ and Git
node --version  # Should be 18+
git --version   # Should be 2.30+
```

### 1. Installation
```bash
# Clone migration tools
git clone https://github.com/semantest/migration-tools
cd migration-tools

# Install dependencies
npm install

# Make scripts executable
chmod +x scripts/*.sh
```

### 2. Basic Migration Commands

#### Full Project Migration
```bash
# Backup first (CRITICAL!)
./scripts/backup-project.sh /path/to/your/project

# Run migration
./scripts/migrate-buddy-to-semantest.sh /path/to/your/project

# Verify results
./scripts/verify-migration.sh /path/to/your/project
```

#### Selective Migration
```bash
# Migrate only package.json files
./scripts/migrate-buddy-to-semantest.sh /path/to/project --files "package.json"

# Migrate only TypeScript files
./scripts/migrate-buddy-to-semantest.sh /path/to/project --type "ts"

# Dry run (preview changes)
./scripts/migrate-buddy-to-semantest.sh /path/to/project --dry-run
```

## 📋 Command Options

### Main Migration Script
```bash
./scripts/migrate-buddy-to-semantest.sh [OPTIONS] <project-path>
```

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run` | Preview changes without applying | `--dry-run` |
| `--backup` | Create backup before migration | `--backup` |
| `--files "pattern"` | Target specific files | `--files "*.json"` |
| `--type "ext"` | Target file extensions | `--type "ts,js"` |
| `--exclude "pattern"` | Exclude files/directories | `--exclude "node_modules"` |
| `--simple-only` | Only simple string replacements | `--simple-only` |
| `--verbose` | Detailed output | `--verbose` |
| `--force` | Skip confirmation prompts | `--force` |

### Examples
```bash
# Conservative migration (config files only)
./scripts/migrate-buddy-to-semantest.sh ./my-project --files "package.json,manifest.json" --backup

# Full migration with verification
./scripts/migrate-buddy-to-semantest.sh ./my-project --backup --verbose

# Preview TypeScript changes
./scripts/migrate-buddy-to-semantest.sh ./my-project --type "ts" --dry-run
```

## 🔄 Rollback Procedures

### Automatic Rollback (if backup exists)
```bash
# Rollback entire project
./scripts/rollback-migration.sh /path/to/project

# Rollback specific files
./scripts/rollback-migration.sh /path/to/project --files "package.json,src/main.ts"
```

### Manual Rollback
```bash
# If backup exists
cp -r /path/to/project.backup/* /path/to/project/

# Using Git (if committed)
git checkout HEAD~1 -- .
git reset --hard HEAD~1

# Partial rollback
git checkout HEAD~1 -- package.json src/
```

### Emergency Rollback (Production)
```bash
# Stop services
sudo systemctl stop semantest-service

# Restore from backup
sudo cp -r /backup/project/* /production/path/

# Restart with old names
sudo systemctl start web-buddy-service  # Use old service name

# Update DNS/load balancer back to old endpoints
```

## ⚠️ Critical Safety Checks

### Before Migration
- [ ] **Backup everything** (code, database, configs)
- [ ] **Stop all services** using WebBuddy
- [ ] **Test rollback procedure** in staging
- [ ] **Check dependencies** for buddy references
- [ ] **Notify team** of migration timeline

### During Migration
- [ ] **Monitor logs** for errors
- [ ] **Check file counts** (should match original)
- [ ] **Verify syntax** of modified files
- [ ] **Test critical paths** immediately

### After Migration
- [ ] **Run full test suite**
- [ ] **Check service health**
- [ ] **Verify external integrations**
- [ ] **Update documentation**
- [ ] **Monitor for 24 hours**

## 🏥 Emergency Procedures

### If Migration Fails
```bash
# Immediate rollback
./scripts/rollback-migration.sh /path/to/project --force

# Check what went wrong
./scripts/diagnose-migration.sh /path/to/project

# Report issue
./scripts/report-issue.sh /path/to/project
```

### If Services Won't Start
```bash
# Use compatibility mode
export SEMANTEST_COMPATIBILITY_MODE=true
systemctl start semantest-service

# Check logs
journalctl -u semantest-service -f
```

### If Database Issues
```bash
# Check for buddy references in DB
./scripts/check-database-references.sh

# Rollback database
./scripts/rollback-database.sh --backup-file /backup/db.sql
```

## 📞 Support & Troubleshooting

### Common Issues

**"Command not found: semantest"**
```bash
# Install global CLI
npm install -g @semantest/cli

# Or use npx
npx @semantest/cli --version
```

**"Module not found: @web-buddy/core"**
```bash
# Install compatibility package
npm install @web-buddy/core@latest  # Redirects to semantest

# Or update imports
./scripts/fix-imports.sh /path/to/project
```

**"Tests failing after migration"**
```bash
# Update test references
./scripts/update-test-references.sh /path/to/project

# Check for hardcoded references
grep -r "buddy\|Buddy" test/
```

### Getting Help
- **Discord**: https://discord.gg/semantest
- **GitHub Issues**: https://github.com/semantest/migration-tools/issues
- **Email**: migration-help@semantest.com
- **Emergency**: support@semantest.com (24/7)

## 🎯 Success Checklist

### Migration Complete When:
- [ ] All "buddy" references replaced appropriately
- [ ] All tests pass
- [ ] Services start and respond correctly
- [ ] External integrations work
- [ ] Performance is equivalent or better
- [ ] Documentation is updated
- [ ] Team is trained on new naming

### Post-Migration Tasks
1. **Update CI/CD** pipelines with new package names
2. **Update monitoring** dashboards and alerts
3. **Inform users** of new URLs and package names
4. **Schedule cleanup** of old backups (after 30 days)
5. **Update marketing** materials and websites

---

**⏰ Migration Time Estimate**: 2-4 hours for typical project  
**🔄 Rollback Time**: 15-30 minutes  
**📞 Support**: Available 24/7 during migration period  

**Last Updated**: 2025-01-18 12:17 CEST  
**Version**: 1.0.0