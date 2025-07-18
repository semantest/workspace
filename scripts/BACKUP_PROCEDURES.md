# Semantest Migration Backup Procedures

## 🛡️ Overview

This document outlines the comprehensive backup procedures for the WebBuddy → Semantest migration process. All migrations create automatic backups to ensure zero data loss.

## 📦 What's Included in Backups

### Automatically Backed Up
✅ **Source Code Files**
- All `.ts`, `.js`, `.tsx`, `.jsx` files
- Configuration files: `package.json`, `tsconfig.json`, `.eslintrc`
- Manifest files: `manifest.json`, `extension.json`
- Documentation: `.md`, `.org`, `.txt` files
- Scripts: `.sh`, `.py`, `.rb` files

✅ **Project Configuration**
- `.env` files (encrypted in backup)
- `.gitignore` and Git configuration
- Build configuration files
- CI/CD pipeline definitions

✅ **Dependencies**
- `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`
- Dependency version information
- Local patches and overrides

✅ **Test Files**
- Unit tests, integration tests, E2E tests
- Test fixtures and mock data
- Test configuration files

### Excluded from Backups
❌ **Large/Generated Files**
- `node_modules/` directory
- `dist/`, `build/`, `out/` directories
- `.cache/` directories
- Log files (`*.log`)
- Temporary files (`*.tmp`, `*.temp`)

❌ **Sensitive Data**
- Private keys (unless specifically included)
- Database dumps (backed up separately)
- User data files
- Analytics data

❌ **Version Control**
- `.git/` directory (Git history preserved separately)
- `.svn/`, `.hg/` directories

## 🔧 Backup Creation Process

### Automatic Backup (Default)
```bash
# Migration script creates backup automatically
./migrate-buddy.sh /path/to/project

# Creates: /path/to/project.backup-YYYYMMDD-HHMMSS/
# Example: /home/user/myapp.backup-20250118-140215/
```

### Manual Backup
```bash
# Create full backup before migration
./scripts/create-backup.sh /path/to/project

# Custom backup location
./scripts/create-backup.sh /path/to/project --output /backups/

# Include node_modules (not recommended)
./scripts/create-backup.sh /path/to/project --include-deps
```

### Backup Structure
```
project.backup-20250118-140215/
├── src/                    # All source files
├── config/                 # Configuration files
├── tests/                  # Test files
├── package.json           # Original package.json
├── backup-manifest.json   # Backup metadata
└── restore.sh            # One-click restore script
```

## 🔄 Restore Procedures

### Quick Restore (Recommended)
```bash
# Using the restore script
cd /path/to/project.backup-20250118-140215/
./restore.sh

# This will:
# 1. Verify backup integrity
# 2. Clear current project directory
# 3. Restore all files
# 4. Restore permissions
# 5. Verify restoration
```

### Manual Restore Steps
```bash
# Step 1: Verify backup integrity
./scripts/verify-backup.sh /path/to/backup/

# Step 2: Clear current directory (CAREFUL!)
rm -rf /path/to/project/*

# Step 3: Copy files back
cp -r /path/to/backup/* /path/to/project/

# Step 4: Restore permissions
chmod -R u+rwX,go+rX,go-w /path/to/project/

# Step 5: Reinstall dependencies
cd /path/to/project/
npm install
```

### Selective Restore
```bash
# Restore specific files only
./scripts/restore-files.sh /path/to/backup/ --files "package.json,src/main.ts"

# Restore configuration only
./scripts/restore-files.sh /path/to/backup/ --pattern "*.json,*.config.js"

# Restore without overwriting existing
./scripts/restore-files.sh /path/to/backup/ --no-overwrite
```

## 🚨 Emergency Procedures

### Corrupted Project
```bash
# Force restore from backup
./scripts/emergency-restore.sh /path/to/backup/ --force

# This bypasses all safety checks
# Use only when normal restore fails
```

### Multiple Backups
```bash
# List all available backups
./scripts/list-backups.sh /path/to/project

# Choose specific backup to restore
./scripts/restore-backup.sh --list
# Select: 2 (for second backup in list)
```

### Database Restoration
```bash
# If database changes were made
./scripts/restore-database.sh --backup /backups/db-backup.sql

# Restore to specific point
./scripts/restore-database.sh --timestamp "2025-01-18 14:00:00"
```

## 📋 Backup Verification

### Pre-Migration Checklist
- [ ] Backup created successfully
- [ ] Backup size seems reasonable (not too small)
- [ ] Backup manifest exists and is readable
- [ ] Test restore on staging environment
- [ ] Backup location is secure and accessible

### Post-Backup Verification
```bash
# Verify backup completeness
./scripts/verify-backup.sh /path/to/backup/

# Output:
# ✅ Files backed up: 164
# ✅ Total size: 24.5 MB
# ✅ Config files: Present
# ✅ Source files: Present
# ✅ Manifest valid: Yes
# ✅ Restore script: Executable
```

### Integrity Check
```bash
# Generate checksums
./scripts/generate-checksums.sh /path/to/backup/

# Verify later
./scripts/verify-checksums.sh /path/to/backup/
```

## 🗓️ Backup Retention

### Default Policy
- **Migration backups**: Keep for 30 days
- **Emergency backups**: Keep for 90 days
- **Manual backups**: Keep indefinitely

### Cleanup Old Backups
```bash
# Remove backups older than 30 days
./scripts/cleanup-backups.sh --days 30

# Dry run (preview what will be deleted)
./scripts/cleanup-backups.sh --days 30 --dry-run

# Keep minimum number of backups
./scripts/cleanup-backups.sh --days 30 --keep-min 5
```

## 💾 Storage Recommendations

### Local Storage
- Keep on separate drive/partition
- Minimum 3x project size available
- Regular cleanup of old backups

### Remote Storage
```bash
# Upload to S3
./scripts/upload-backup.sh /path/to/backup/ s3://my-bucket/backups/

# Upload to Google Drive
./scripts/upload-backup.sh /path/to/backup/ gdrive://backups/

# Upload to SFTP
./scripts/upload-backup.sh /path/to/backup/ sftp://backup-server/
```

## 🔐 Security Considerations

### Encryption
```bash
# Create encrypted backup
./scripts/create-backup.sh /path/to/project --encrypt

# Restore encrypted backup (will prompt for password)
./scripts/restore-backup.sh /path/to/backup.enc
```

### Access Control
- Backups created with current user permissions
- Sensitive files maintain original permissions
- `.env` files encrypted by default

## 📞 Support

### If Restore Fails
1. Check backup integrity: `./scripts/verify-backup.sh`
2. Try manual restore steps
3. Contact support with backup manifest
4. Emergency support: backup-help@semantest.com

### Recovery Time
- **Standard restore**: 5-10 minutes
- **Large projects**: 15-30 minutes
- **Emergency support**: < 2 hours response

---

**Last Updated**: 2025-01-18 14:08 CEST  
**Version**: 1.0.0  
**Critical**: Always verify backup before starting migration!