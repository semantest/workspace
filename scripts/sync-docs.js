#!/usr/bin/env node

/**
 * Documentation Synchronization Script
 * 
 * This script synchronizes documentation from all modules to the Docusaurus
 * documentation site, ensuring all modules are properly documented.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const DOCUSAURUS_DOCS = path.join(WORKSPACE_ROOT, 'github-pages-setup', 'docusaurus', 'docs');

// Module documentation mapping
const MODULE_DOCS = [
  {
    module: 'extension.chrome',
    title: 'Chrome Extension',
    description: 'ChatGPT addon and browser automation extension',
    sourceDocs: path.join(WORKSPACE_ROOT, 'extension.chrome', 'docs'),
    targetPath: 'components/extensions',
    files: [
      { src: 'CONTENT_SCRIPT_API.md', dest: 'content-script-api.md' },
      { src: 'USER_GUIDE.md', dest: 'user-guide.md' }
    ]
  },
  {
    module: 'nodejs.server',
    title: 'Node.js Server',
    description: 'Backend API and WebSocket server',
    sourceDocs: path.join(WORKSPACE_ROOT, 'nodejs.server', 'docs'),
    targetPath: 'components/backend',
    files: [
      { src: 'README.md', dest: 'overview.md' },
      { src: 'API.md', dest: 'api-reference.md' }
    ]
  },
  {
    module: 'typescript.client',
    title: 'TypeScript Client',
    description: 'Client SDK for browser automation',
    sourceDocs: path.join(WORKSPACE_ROOT, 'typescript.client', 'docs'),
    targetPath: 'components/sdk',
    files: [
      { src: 'README.md', dest: 'overview.md' },
      { src: 'USAGE.md', dest: 'usage-guide.md' }
    ]
  },
  {
    module: 'application',
    title: 'Application Layer',
    description: 'Core application logic and orchestration',
    sourceDocs: path.join(WORKSPACE_ROOT, 'application', 'docs'),
    targetPath: 'components/application',
    files: [
      { src: 'README.md', dest: 'overview.md' },
      { src: 'ARCHITECTURE.md', dest: 'architecture.md' }
    ]
  },
  {
    module: 'domain',
    title: 'Domain Layer',
    description: 'Domain models and business logic',
    sourceDocs: path.join(WORKSPACE_ROOT, 'domain', 'docs'),
    targetPath: 'components/domain',
    files: [
      { src: 'README.md', dest: 'overview.md' },
      { src: 'MODELS.md', dest: 'models.md' }
    ]
  },
  {
    module: 'infrastructure',
    title: 'Infrastructure',
    description: 'Deployment and infrastructure configuration',
    sourceDocs: path.join(WORKSPACE_ROOT, 'infrastructure', 'docs'),
    targetPath: 'deployment/infrastructure',
    files: [
      { src: 'README.md', dest: 'overview.md' },
      { src: 'DEPLOYMENT.md', dest: 'deployment-guide.md' }
    ]
  }
];

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${path.relative(WORKSPACE_ROOT, dirPath)}`);
  }
}

/**
 * Copy and transform documentation file
 */
function syncDocFile(moduleConfig, fileConfig) {
  const srcPath = path.join(moduleConfig.sourceDocs, fileConfig.src);
  const destDir = path.join(DOCUSAURUS_DOCS, moduleConfig.targetPath);
  const destPath = path.join(destDir, fileConfig.dest);
  
  // Skip if source doesn't exist
  if (!fs.existsSync(srcPath)) {
    console.log(`⚠️  Source not found: ${path.relative(WORKSPACE_ROOT, srcPath)}`);
    return false;
  }
  
  // Ensure destination directory exists
  ensureDir(destDir);
  
  // Read source content
  let content = fs.readFileSync(srcPath, 'utf8');
  
  // Transform content for Docusaurus
  content = transformContent(content, moduleConfig, fileConfig);
  
  // Write to destination
  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`📄 Synced: ${path.relative(WORKSPACE_ROOT, srcPath)} → ${path.relative(WORKSPACE_ROOT, destPath)}`);
  
  return true;
}

/**
 * Transform markdown content for Docusaurus
 */
function transformContent(content, moduleConfig, fileConfig) {
  // Generate Docusaurus frontmatter
  const id = path.basename(fileConfig.dest, '.md');
  const title = generateTitle(fileConfig.dest, moduleConfig.title);
  
  const frontmatter = [
    '---',
    `id: ${id}`,
    `title: ${title}`,
    `sidebar_label: ${title}`,
    `description: ${moduleConfig.description}`,
    '---',
    '',
  ].join('\n');
  
  // Remove existing frontmatter if present
  content = content.replace(/^---[\s\S]*?---\n/, '');
  
  // Fix relative links to absolute GitHub links
  const repoBaseUrl = 'https://github.com/semantest/workspace/tree/main';
  content = content.replace(
    /\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g,
    `[$1](${repoBaseUrl}/${moduleConfig.module}/$2)`
  );
  
  // Add module context header
  const moduleHeader = [
    `> **Module**: \`${moduleConfig.module}\` | **Type**: ${moduleConfig.description}`,
    '',
  ].join('\n');
  
  return frontmatter + moduleHeader + content;
}

/**
 * Generate appropriate title from filename
 */
function generateTitle(filename, moduleTitle) {
  const base = path.basename(filename, '.md');
  
  // Special cases
  const titleMap = {
    'overview': 'Overview',
    'readme': 'Overview',
    'content-script-api': 'Content Script API',
    'user-guide': 'User Guide',
    'api-reference': 'API Reference',
    'usage-guide': 'Usage Guide',
    'deployment-guide': 'Deployment Guide',
  };
  
  return titleMap[base.toLowerCase()] || 
         base.split('-').map(word => 
           word.charAt(0).toUpperCase() + word.slice(1)
         ).join(' ');
}

/**
 * Generate module README files if missing
 */
function generateModuleReadme(moduleConfig) {
  const readmePath = path.join(WORKSPACE_ROOT, moduleConfig.module, 'docs', 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    const docsDir = path.dirname(readmePath);
    ensureDir(docsDir);
    
    const content = [
      `# ${moduleConfig.title}`,
      '',
      moduleConfig.description,
      '',
      '## Overview',
      '',
      `This module provides ${moduleConfig.description.toLowerCase()}.`,
      '',
      '## Installation',
      '',
      '```bash',
      'npm install',
      '```',
      '',
      '## Usage',
      '',
      'TODO: Add usage examples',
      '',
      '## API Reference',
      '',
      'TODO: Document API',
      '',
      '## Contributing',
      '',
      'See the main [Contributing Guide](../../docs/CONTRIBUTING.md).',
      '',
    ].join('\n');
    
    fs.writeFileSync(readmePath, content, 'utf8');
    console.log(`📄 Generated: ${path.relative(WORKSPACE_ROOT, readmePath)}`);
  }
}

/**
 * Update Docusaurus sidebar configuration
 */
function updateSidebar() {
  const sidebarPath = path.join(WORKSPACE_ROOT, 'github-pages-setup', 'docusaurus', 'sidebars.js');
  
  console.log('📋 Sidebar will be updated manually to include new documentation sections');
  console.log(`   Edit: ${path.relative(WORKSPACE_ROOT, sidebarPath)}`);
}

/**
 * Main synchronization function
 */
async function syncDocumentation() {
  console.log('🚀 Starting documentation synchronization...\n');
  
  let totalSynced = 0;
  let totalModules = 0;
  
  for (const moduleConfig of MODULE_DOCS) {
    console.log(`📁 Processing module: ${moduleConfig.module}`);
    totalModules++;
    
    // Generate README if missing
    generateModuleReadme(moduleConfig);
    
    // Sync each documented file
    let moduleSynced = 0;
    for (const fileConfig of moduleConfig.files) {
      if (syncDocFile(moduleConfig, fileConfig)) {
        moduleSynced++;
        totalSynced++;
      }
    }
    
    console.log(`   → Synced ${moduleSynced}/${moduleConfig.files.length} files\n`);
  }
  
  // Update sidebar
  updateSidebar();
  
  console.log(`✅ Documentation sync complete!`);
  console.log(`   Modules processed: ${totalModules}`);
  console.log(`   Files synced: ${totalSynced}`);
  console.log(`   Target: ${path.relative(WORKSPACE_ROOT, DOCUSAURUS_DOCS)}`);
}

// Run if called directly
if (require.main === module) {
  syncDocumentation().catch(error => {
    console.error('❌ Documentation sync failed:', error);
    process.exit(1);
  });
}

module.exports = { syncDocumentation };