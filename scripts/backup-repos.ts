#!/usr/bin/env node

/**
 * Pre-Migration Backup Script
 * Creates a complete backup of all repositories before the WebBuddy to Semantest migration
 * 
 * Features:
 * - Full repository backup with all files
 * - Excludes node_modules and other build artifacts
 * - Creates compressed archive
 * - Generates backup manifest
 * 
 * Usage:
 *   npm run backup
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as glob from 'glob';
import { promisify } from 'util';

const BACKUP_DIR = 'backups/pre-migration-20250718';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

interface BackupManifest {
  timestamp: string;
  totalFiles: number;
  totalSize: string;
  repositories: string[];
  excludedPatterns: string[];
  backupPath: string;
}

async function main() {
  console.log('🔒 Pre-Migration Backup Script');
  console.log('=============================\n');
  console.log(`📅 Timestamp: ${TIMESTAMP}`);
  console.log(`📁 Backup Directory: ${BACKUP_DIR}\n`);

  // Ensure backup directory exists
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Get all files to backup
  const files = await getFilesToBackup();
  console.log(`📊 Found ${files.length} files to backup\n`);

  // Create backup
  console.log('📦 Creating backup archive...');
  const archiveName = `semantest-backup-${TIMESTAMP}.tar.gz`;
  const archivePath = path.join(BACKUP_DIR, archiveName);
  
  // Create tar archive excluding certain patterns
  const excludePatterns = [
    '--exclude=node_modules',
    '--exclude=.git',
    '--exclude=dist',
    '--exclude=build',
    '--exclude=coverage',
    '--exclude=*.log',
    '--exclude=.DS_Store',
    '--exclude=backups'
  ];

  try {
    execSync(`tar -czf ${archivePath} ${excludePatterns.join(' ')} .`, {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`  ✓ Archive created: ${archivePath}\n`);
  } catch (error) {
    console.error('❌ Failed to create archive:', error);
    process.exit(1);
  }

  // Get archive size
  const stats = fs.statSync(archivePath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

  // Create backup manifest
  const manifest: BackupManifest = {
    timestamp: TIMESTAMP,
    totalFiles: files.length,
    totalSize: `${sizeInMB} MB`,
    repositories: ['semantest'],
    excludedPatterns: excludePatterns.map(p => p.replace('--exclude=', '')),
    backupPath: archivePath
  };

  // Write manifest
  const manifestPath = path.join(BACKUP_DIR, 'backup-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📋 Backup Manifest:`);
  console.log(`  - Total Files: ${manifest.totalFiles}`);
  console.log(`  - Archive Size: ${manifest.totalSize}`);
  console.log(`  - Manifest: ${manifestPath}\n`);

  // Create README for the backup
  const readmePath = path.join(BACKUP_DIR, 'README.md');
  const readmeContent = `# Pre-Migration Backup

## Overview
This backup was created before the WebBuddy to Semantest migration.

## Details
- **Date**: ${new Date().toISOString()}
- **Archive**: ${archiveName}
- **Size**: ${manifest.totalSize}
- **Files**: ${manifest.totalFiles}

## Excluded Patterns
${manifest.excludedPatterns.map(p => `- ${p}`).join('\n')}

## Restoration
To restore from this backup:

\`\`\`bash
# Extract the archive
tar -xzf ${archiveName}

# Or use the migration script rollback feature
npm run migrate:rollback
\`\`\`

## Contents
- All source code files
- Configuration files
- Documentation
- Scripts and tools

## Notes
This backup was created automatically by the migration process to ensure data safety.
`;

  fs.writeFileSync(readmePath, readmeContent);
  console.log(`📄 Created backup README: ${readmePath}\n`);

  console.log('✅ Backup completed successfully!');
  console.log(`🔒 Archive location: ${archivePath}`);
}

async function getFilesToBackup(): Promise<string[]> {
  const globAsync = promisify(glob.glob);
  const patterns = [
    '**/*',
    '.*'  // Include hidden files
  ];
  
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.log',
    '**/backups/**'
  ];
  
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await globAsync(pattern, { 
      ignore: ignorePatterns,
      nodir: true 
    });
    files.push(...matches);
  }
  
  return [...new Set(files)]; // Remove duplicates
}

// Run the backup
main().catch(error => {
  console.error('❌ Backup failed:', error);
  process.exit(1);
});