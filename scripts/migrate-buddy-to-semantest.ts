#!/usr/bin/env node

/**
 * Automated migration script for WebBuddy to Semantest rebranding
 * 
 * Features:
 * - Dry run mode to preview changes
 * - Selective replacement with pattern filtering
 * - Rollback capability with backup creation
 * - Security exclusion handling
 * 
 * Usage:
 *   npm run migrate -- --dry-run
 *   npm run migrate -- --pattern simple
 *   npm run migrate -- --rollback
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as glob from 'glob';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Load replacement mapping
const MAPPING_FILE = path.join(__dirname, 'replacement-mapping.json');
const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));

interface ReplacementPattern {
  pattern: string;
  replacement?: string;
  count: number;
  reason?: string;
  severity?: string;
}

interface MigrationOptions {
  dryRun: boolean;
  pattern?: string;
  rollback: boolean;
  verbose: boolean;
  backup: boolean;
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .options({
    'dry-run': {
      type: 'boolean',
      description: 'Preview changes without modifying files',
      default: false
    },
    'pattern': {
      type: 'string',
      description: 'Filter patterns (simple, contextAware, all)',
      default: 'all'
    },
    'rollback': {
      type: 'boolean',
      description: 'Rollback to previous state',
      default: false
    },
    'verbose': {
      type: 'boolean',
      description: 'Show detailed output',
      default: false
    },
    'backup': {
      type: 'boolean',
      description: 'Create backup before migration',
      default: true
    }
  })
  .parseSync() as MigrationOptions;

async function main() {
  console.log('🚀 Semantest Migration Script');
  console.log('============================\n');

  if (argv.rollback) {
    await performRollback();
    return;
  }

  if (argv.backup && !argv.dryRun) {
    await createBackup();
  }

  const patterns = getPatterns(argv.pattern || 'all');
  const securityExclusions = mapping.securityExclusions || [];

  console.log(`📋 Migration Configuration:`);
  console.log(`  - Mode: ${argv.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  - Pattern Set: ${argv.pattern}`);
  console.log(`  - Total Patterns: ${patterns.length}`);
  console.log(`  - Security Exclusions: ${securityExclusions.length}\n`);

  if (argv.dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }

  // Get all files to process
  const files = await getFilesToProcess();
  console.log(`📁 Found ${files.length} files to process\n`);
  
  let totalReplacements = 0;
  let filesModified = 0;
  
  for (const file of files) {
    const replacements = await processFile(file, patterns, securityExclusions, argv.dryRun);
    if (replacements > 0) {
      filesModified++;
      totalReplacements += replacements;
      if (argv.verbose) {
        console.log(`  ✓ ${file}: ${replacements} replacements`);
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Files scanned: ${files.length}`);
  console.log(`  - Files modified: ${filesModified}`);
  console.log(`  - Total replacements: ${totalReplacements}`);

  console.log('\n✅ Migration complete!');
}

function getPatterns(patternType: string): ReplacementPattern[] {
  const patterns: ReplacementPattern[] = [];
  
  if (patternType === 'all' || patternType === 'simple') {
    patterns.push(...mapping.simple || []);
  }
  
  if (patternType === 'all' || patternType === 'contextAware') {
    patterns.push(...mapping.contextAware || []);
  }
  
  return patterns;
}

async function getFilesToProcess(): Promise<string[]> {
  const globAsync = promisify(glob.glob);
  const patterns = [
    '**/*.ts',
    '**/*.js',
    '**/*.json',
    '**/*.md',
    '**/*.yml',
    '**/*.yaml',
    '**/Dockerfile',
    '**/.env*'
  ];
  
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/backup-*/**'
  ];
  
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await globAsync(pattern, { ignore: ignorePatterns });
    files.push(...matches);
  }
  
  return [...new Set(files)]; // Remove duplicates
}

async function processFile(
  filePath: string, 
  patterns: ReplacementPattern[], 
  securityExclusions: ReplacementPattern[],
  dryRun: boolean
): Promise<number> {
  // Validate path to prevent traversal
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  let replacementCount = 0;
  
  // Check security exclusions first
  for (const exclusion of securityExclusions) {
    if (content.includes(exclusion.pattern)) {
      if (argv.verbose) {
        console.log(`  ⚠️  Skipping ${filePath}: Contains security pattern [REDACTED]`);
      }
      return 0;
    }
  }
  
  // Apply replacements
  for (const pattern of patterns) {
    if (!pattern.replacement) continue;
    
    const regex = new RegExp(pattern.pattern, 'g');
    const matches = content.match(regex);
    if (matches) {
      replacementCount += matches.length;
      newContent = newContent.replace(regex, pattern.replacement);
    }
  }
  
  if (replacementCount > 0 && !dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
  
  return replacementCount;
}

async function createBackup(): Promise<void> {
  console.log('📦 Creating backup...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-${timestamp}`;
  
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Copy current state
  const files = await getFilesToProcess();
  for (const file of files) {
    const backupPath = path.join(backupDir, file);
    const dir = path.dirname(backupPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(file, backupPath);
  }
  
  console.log(`  ✓ Backup created in ${backupDir}\n`);
}

async function performRollback(): Promise<void> {
  console.log('⏮️  Performing rollback...');
  
  // Find most recent backup
  const backups = glob.sync('backup-*').sort().reverse();
  if (backups.length === 0) {
    throw new Error('No backup found for rollback');
  }
  
  const latestBackup = backups[0];
  console.log(`  Using backup: ${latestBackup}`);
  
  // Restore files from backup
  const backupFiles = await promisify(glob.glob)(`${latestBackup}/**/*`, { nodir: true });
  for (const backupFile of backupFiles) {
    const originalPath = backupFile.replace(`${latestBackup}/`, '');
    fs.copyFileSync(backupFile, originalPath);
  }
  
  console.log(`  ✓ Rollback complete from ${latestBackup}`);
}

// Run the migration
main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});