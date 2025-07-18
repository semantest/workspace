#!/bin/bash

# Semantest Pre-Migration Backup Script
# Creates a full backup of all repositories before migration
# Usage: ./backup-repos.sh

set -euo pipefail

# Configuration
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_ROOT="backups/pre-migration-${BACKUP_DATE}"
REPOS=(
  "browser"
  "chatgpt.com"
  "docs"
  "extension.chrome"
  "google.com"
  "nodejs.server"
  "typescript.client"
)

# Create backup directory
echo "🗄️  Creating backup directory: ${BACKUP_ROOT}"
mkdir -p "${BACKUP_ROOT}"

# Backup metadata
echo "📋 Creating backup metadata..."
cat > "${BACKUP_ROOT}/backup-metadata.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "type": "pre-migration",
  "repositories": ${#REPOS[@]},
  "gitCommit": "$(git rev-parse HEAD)",
  "branch": "$(git branch --show-current)"
}
EOF

# Backup each repository
echo "📦 Starting repository backups..."
for repo in "${REPOS[@]}"; do
  echo "  → Backing up ${repo}..."
  
  if [ -d "${repo}" ]; then
    # Create tarball excluding node_modules and .git
    tar --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='build' \
        -czf "${BACKUP_ROOT}/${repo}.tar.gz" \
        "${repo}/"
    
    echo "    ✓ ${repo} backed up successfully"
  else
    echo "    ⚠️  ${repo} directory not found, skipping"
  fi
done

# Backup scripts and configuration
echo "📄 Backing up scripts and configuration..."
tar -czf "${BACKUP_ROOT}/scripts-config.tar.gz" \
    scripts/ \
    roadmap/ \
    *.md \
    *.json \
    .claude/ \
    2>/dev/null || true

# Create backup verification script
cat > "${BACKUP_ROOT}/verify-backup.sh" << 'EOF'
#!/bin/bash
echo "🔍 Verifying backup integrity..."
for file in *.tar.gz; do
  if tar -tzf "$file" > /dev/null 2>&1; then
    echo "  ✓ $file is valid"
  else
    echo "  ❌ $file is corrupted!"
    exit 1
  fi
done
echo "✅ All backups verified successfully"
EOF
chmod +x "${BACKUP_ROOT}/verify-backup.sh"

# Generate summary
BACKUP_SIZE=$(du -sh "${BACKUP_ROOT}" | cut -f1)
echo ""
echo "✅ Backup completed successfully!"
echo "📁 Location: ${BACKUP_ROOT}"
echo "💾 Total size: ${BACKUP_SIZE}"
echo ""
echo "To verify: cd ${BACKUP_ROOT} && ./verify-backup.sh"
echo "To restore: See BACKUP_PROCEDURES.md"