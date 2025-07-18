#!/usr/bin/env node
/*
 * Semantest Buddy References Scanner
 * Scans all project files for variations of "buddy" references
 * Outputs comprehensive JSON report with file paths, line numbers, and context
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface BuddyReference {
  variation: string;
  line: number;
  column: number;
  context: 'code' | 'comment' | 'string';
  lineText: string;
}

interface FileReport {
  filePath: string;
  occurrenceCount: number;
  references: BuddyReference[];
}

interface ScanReport {
  scanDate: string;
  totalFiles: number;
  totalOccurrences: number;
  fileTypes: { [key: string]: number };
  variations: { [key: string]: number };
  files: FileReport[];
}

// All buddy variations to search for (case-insensitive)
const BUDDY_PATTERNS = [
  // Basic variations
  'buddy',
  'semantest',
  'semantest',
  'semantest',
  
  // Case variations
  'Buddy',
  'Semantest',
  'Web-Buddy',
  'Web_Buddy',
  'BUDDY',
  'SEMANTEST',
  'SEMANTEST',
  'SEMANTEST',
  
  // Camel case variations
  'webBuddy',
  'Semantest',
  
  // Package/import variations
  '@semantest',
  '@semantest',
  'semantest/',
  'semantest/',
  '@buddy',
  'buddy/',
  
  // Class/interface names
  'BuddyClient',
  'BuddyServer',
  'BuddyPlugin',
  'BuddyAdapter',
  'BuddyEvent',
  'BuddyMessage',
  'SemantestClient',
  'SemantestServer',
  'BuddyStorage',
  'BuddyPattern',
  'BuddyContract',
  'BuddyDownload',
  'BuddyExtension',
  'BuddySession',
  'BuddyCoordination',
  
  // File name patterns
  'buddy-',
  '-semantest',
  '_buddy',
  'buddy_',
  'buddy\\.',
  '\\.buddy',
  
  // Config/constant patterns
  'BUDDY_',
  '_BUDDY',
  'SEMANTEST_',
  '_SEMANTEST',
  'BUDDY:',
  ':BUDDY',
  
  // Method/function patterns
  'buddy\\(',
  'Buddy\\(',
  'webBuddy\\(',
  'Semantest\\(',
  'getBuddy',
  'setBuddy',
  'createBuddy',
  'useBuddy',
  'withBuddy',
  
  // Property patterns
  '\\.buddy',
  '\\.webBuddy',
  '\\.Semantest',
  '\\.Buddy',
  '\\[buddy',
  'buddy\\]',
  
  // String patterns
  '"buddy',
  'buddy"',
  "'buddy",
  "buddy'",
  '"semantest',
  'semantest"',
  '`semantest',
  'buddy`',
  
  // Comment patterns
  '\\*.*buddy',
  '//.*buddy',
  '#.*buddy',
  '<!--.*buddy',
  
  // ChatGPT variations
  'chatgpt-semantest',
  'chatgptBuddy',
  'ChatGPTBuddy',
  'CHATGPT_BUDDY',
  'chatgpt_buddy',
  'chatgpt buddy',
  'ChatGPT-Buddy',
  
  // Google variations  
  'google-semantest',
  'googleBuddy',
  'GoogleBuddy',
  'GOOGLE_BUDDY',
  'google_buddy',
  'google buddy',
  'Google-Buddy',
  
  // URL/path patterns
  '/semantest',
  'buddy/',
  '/semantest',
  'semantest/',
  '-semantest-',
  '_buddy_',
  
  // Domain/namespace patterns
  'buddy\\.',
  '\\.buddy',
  'buddy::',
  '::buddy',
  'buddy-v',
  'buddy@',
  '@buddy',
  
  // Contract/protocol patterns
  'buddy-contract',
  'buddy-protocol',
  'buddy-interface',
  'buddy-schema',
  
  // Event patterns
  'buddy-event',
  'buddy:',
  ':buddy',
  'on-semantest',
  'emit-semantest',
  
  // Package.json patterns
  'semantest-semantest',
  '@semantest/semantest',
  'buddy-core',
  'buddy-extension',
  'buddy-client',
  'buddy-server'
];

// File extensions to scan
const FILE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.html',
  '.css',
  '.scss',
  '.org',
  '.txt',
  '.xml',
  '.d.ts',
  '.mjs',
  '.cjs',
  '.vue',
  '.sh',
  '.env',
  '.env.example',
  '.gitignore',
  'LICENSE',
  'README',
  'Dockerfile',
  '.dockerignore',
  '.py',
  '.mdb',
  'manifest.json',
  'package.json',
  'tsconfig.json',
  'jest.config.js',
  '.eslintrc',
  '.prettierrc'
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'coverage',
  '.cache'
];

// Files to exclude
const EXCLUDE_FILES = [
  'buddy-scan-report.json',
  'scan-semantest-references.ts'
];

/**
 * Determine the context of a match (code, comment, or string)
 */
function getContext(line: string, match: RegExpMatchArray): 'code' | 'comment' | 'string' {
  const beforeMatch = line.substring(0, match.index || 0);
  
  // Check if in comment
  if (beforeMatch.includes('//') || beforeMatch.includes('/*') || beforeMatch.includes('#')) {
    return 'comment';
  }
  
  // Check if in string
  const singleQuotes = (beforeMatch.match(/'/g) || []).length;
  const doubleQuotes = (beforeMatch.match(/"/g) || []).length;
  const backticks = (beforeMatch.match(/`/g) || []).length;
  
  if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
    return 'string';
  }
  
  return 'code';
}

/**
 * Scan a single file for buddy references
 */
function scanFile(filePath: string): FileReport | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const references: BuddyReference[] = [];
    
    // Create regex pattern for all variations
    const pattern = new RegExp(BUDDY_PATTERNS.join('|'), 'gi');
    
    lines.forEach((line, lineIndex) => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        references.push({
          variation: match[0],
          line: lineIndex + 1,
          column: match.index + 1,
          context: getContext(line, match),
          lineText: line.trim()
        });
      }
    });
    
    if (references.length > 0) {
      return {
        filePath,
        occurrenceCount: references.length,
        references
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return null;
  }
}

/**
 * Find all files to scan
 */
function findFiles(rootDir: string): string[] {
  const files: string[] = [];
  
  // First, find files with specific extensions
  FILE_EXTENSIONS.forEach(ext => {
    let pattern;
    if (ext.startsWith('.')) {
      pattern = `**/*${ext}`;
    } else {
      // For files without extensions like LICENSE, README, etc.
      pattern = `**/${ext}`;
    }
    
    const globOptions = {
      cwd: rootDir,
      ignore: [
        ...EXCLUDE_DIRS.map(dir => `**/${dir}/**`),
        ...EXCLUDE_FILES.map(file => `**/${file}`)
      ],
      absolute: false
    };
    
    const foundFiles = glob.sync(pattern, globOptions);
    files.push(...foundFiles.map(f => path.join(rootDir, f)));
  });
  
  // Also scan package.json files specifically
  const packageJsons = glob.sync('**/package.json', {
    cwd: rootDir,
    ignore: [
      ...EXCLUDE_DIRS.map(dir => `**/${dir}/**`),
      ...EXCLUDE_FILES.map(file => `**/${file}`)
    ],
    absolute: false
  });
  files.push(...packageJsons.map(f => path.join(rootDir, f)));
  
  // Remove duplicates and filter out excluded files
  const uniqueFiles = [...new Set(files)];
  return uniqueFiles.filter(file => {
    const basename = path.basename(file);
    return !EXCLUDE_FILES.includes(basename);
  });
}

/**
 * Main scanning function
 */
async function scanProject(): Promise<void> {
  console.log('🔍 Starting buddy references scan...\n');
  
  const rootDir = path.resolve(__dirname, '..');
  const files = findFiles(rootDir);
  
  console.log(`📁 Found ${files.length} files to scan\n`);
  
  const report: ScanReport = {
    scanDate: new Date().toISOString(),
    totalFiles: 0,
    totalOccurrences: 0,
    fileTypes: {},
    variations: {},
    files: []
  };
  
  // Scan each file
  let processedCount = 0;
  files.forEach((file) => {
    processedCount++;
    if (processedCount % 50 === 0) {
      console.log(`  Processing... ${processedCount}/${files.length} files`);
    }
    
    const fileReport = scanFile(file);
    if (fileReport) {
      report.files.push(fileReport);
      report.totalFiles++;
      report.totalOccurrences += fileReport.occurrenceCount;
      
      // Track file types
      const ext = path.extname(file);
      report.fileTypes[ext] = (report.fileTypes[ext] || 0) + 1;
      
      // Track variations
      fileReport.references.forEach(ref => {
        const normalized = ref.variation.toLowerCase();
        report.variations[normalized] = (report.variations[normalized] || 0) + 1;
      });
    }
  });
  
  // Sort files by occurrence count
  report.files.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  
  // Save report
  const outputPath = path.join(rootDir, 'scripts', 'buddy-scan-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n✅ Scan complete!\n');
  console.log('📊 Summary:');
  console.log(`  - Total files scanned: ${files.length}`);
  console.log(`  - Files with buddy references: ${report.totalFiles}`);
  console.log(`  - Total occurrences: ${report.totalOccurrences}`);
  console.log('\n📈 Top variations:');
  
  const topVariations = Object.entries(report.variations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  topVariations.forEach(([variation, count]) => {
    console.log(`  - "${variation}": ${count} occurrences`);
  });
  
  console.log('\n📄 Top files:');
  report.files.slice(0, 10).forEach(file => {
    console.log(`  - ${file.filePath}: ${file.occurrenceCount} occurrences`);
  });
  
  console.log(`\n💾 Full report saved to: ${outputPath}`);
  
  // Verification
  if (report.totalFiles < 164) {
    console.warn(`\n⚠️  WARNING: Found only ${report.totalFiles} files with buddy references.`);
    console.warn('   Expected at least 164 files. Please check the patterns and file types.');
  } else {
    console.log(`\n✨ Success! Found ${report.totalFiles} files (expected 164+)`);
  }
}

// Execute if run directly
if (require.main === module) {
  scanProject().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { scanProject };