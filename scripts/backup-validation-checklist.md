# Backup Validation Checklist

**Purpose**: Step-by-step checklist to ensure backup integrity for WebBuddy → Semantest migration  
**Last Updated**: 2025-07-18 14:04 CEST

## 🔍 Pre-Backup Validation

### System Requirements
- [ ] **Disk Space**: Verify 2x project size available
  - Current project size: _______ GB
  - Available space: _______ GB
  - Status: PASS / FAIL

- [ ] **Permissions**: Verify write permissions to backup location
  - Backup path: `./backup-YYYY-MM-DDTHH-MM-SS-mmm`
  - Write test: PASS / FAIL

- [ ] **Dependencies**: All required tools installed
  - [ ] Node.js >= 16.x
  - [ ] npm >= 8.x
  - [ ] ts-node installed
  - [ ] All npm packages installed

### Pre-Backup State
- [ ] **Git Status**: All changes committed
  ```bash
  git status
  # Expected: "nothing to commit, working tree clean"
  ```

- [ ] **File Count**: Document original file count
  ```bash
  find . -type f -not -path "./node_modules/*" -not -path "./.git/*" | wc -l
  # Original count: _______
  ```

- [ ] **Checksum Generation**: Create original checksums
  ```bash
  find . -type f -not -path "./node_modules/*" -not -path "./.git/*" \
    -exec sha256sum {} \; > original-checksums.txt
  ```

## 📦 During Backup Validation

### Backup Execution
- [ ] **Command Executed**: 
  ```bash
  npm run backup
  # OR
  npm run migrate -- --backup --dry-run
  ```

- [ ] **Progress Monitoring**:
  - [ ] No error messages displayed
  - [ ] Progress indication visible
  - [ ] Memory usage < 1GB
  - [ ] CPU usage reasonable

- [ ] **Backup Folder Created**:
  - Folder name: `backup-_________________`
  - Timestamp format correct: PASS / FAIL

## ✅ Post-Backup Validation

### File Verification
- [ ] **File Count Match**:
  ```bash
  BACKUP_DIR="backup-XXXX"  # Replace with actual
  find "$BACKUP_DIR" -type f | wc -l
  # Backup count: _______
  # Matches original: YES / NO
  ```

- [ ] **Directory Structure**:
  ```bash
  tree -d -L 3 . > original-structure.txt
  tree -d -L 3 "$BACKUP_DIR" > backup-structure.txt
  diff original-structure.txt backup-structure.txt
  # Structures match: YES / NO
  ```

- [ ] **Excluded Directories Absent**:
  - [ ] No `node_modules/` in backup
  - [ ] No `.git/` in backup
  - [ ] No `dist/` in backup
  - [ ] No `build/` in backup
  - [ ] No `coverage/` in backup

### Integrity Verification
- [ ] **Checksum Comparison**:
  ```bash
  # For each file in original-checksums.txt
  while IFS= read -r line; do
    checksum=$(echo "$line" | cut -d' ' -f1)
    filepath=$(echo "$line" | cut -d' ' -f3)
    backup_file="$BACKUP_DIR/$filepath"
    
    if [ -f "$backup_file" ]; then
      backup_sum=$(sha256sum "$backup_file" | cut -d' ' -f1)
      if [ "$checksum" = "$backup_sum" ]; then
        echo "✓ $filepath"
      else
        echo "✗ MISMATCH: $filepath"
      fi
    else
      echo "✗ MISSING: $filepath"
    fi
  done < original-checksums.txt
  ```
  - All checksums match: YES / NO
  - Files with mismatches: _______

- [ ] **Special Files Check**:
  - [ ] `.env` files backed up
  - [ ] `.gitignore` backed up
  - [ ] Hidden files included
  - [ ] Empty files preserved

- [ ] **Binary Files Integrity**:
  - [ ] Images (PNG, JPG) intact
  - [ ] Fonts preserved
  - [ ] Other binary files OK

## 🔄 Restore Validation

### Pre-Restore Preparation
- [ ] **Test Environment**: Create test directory
  ```bash
  mkdir test-restore
  cp -r src test-restore/  # Copy subset for testing
  ```

- [ ] **Baseline Established**: 
  - Original checksums saved
  - File count documented
  - Test files prepared

### Restore Execution
- [ ] **Restore Command**:
  ```bash
  npm run migrate -- --rollback
  # OR manual restore from backup
  ```

- [ ] **Restore Monitoring**:
  - [ ] No error messages
  - [ ] Files being copied
  - [ ] Progress indication

### Post-Restore Verification
- [ ] **File Restoration**:
  ```bash
  # Compare restored files with original checksums
  sha256sum -c original-checksums.txt
  # All files OK: YES / NO
  ```

- [ ] **Application Functionality**:
  - [ ] TypeScript compilation works
  - [ ] Tests pass
  - [ ] Application starts correctly
  - [ ] No missing dependencies

- [ ] **Data Integrity**:
  - [ ] Text files readable
  - [ ] JSON files valid
  - [ ] Binary files intact
  - [ ] Configurations preserved

## 📋 Final Validation Report

### Summary
- **Backup Date/Time**: _______________________
- **Backup Size**: _______ MB
- **Files Backed Up**: _______
- **Restore Tested**: YES / NO
- **Data Loss**: NONE / SOME (details: _______)
- **Overall Status**: PASS / FAIL

### Sign-off
- [ ] **QA Approval**: All tests passed
  - Name: _______________________
  - Date: _______________________
  
- [ ] **Technical Review**: Backup verified
  - Name: _______________________
  - Date: _______________________

### Issues Found
| Issue | Severity | Resolution |
|-------|----------|------------|
| | | |
| | | |

### Recommendations
1. _________________________________
2. _________________________________
3. _________________________________

---

**Note**: This checklist must be completed before proceeding with production migration. Any failures must be resolved and re-tested.