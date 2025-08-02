#!/usr/bin/env node

/**
 * Package script for Chrome Web Store submission
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const OUTPUT_FILE = path.join(__dirname, '..', 'semantest-chatgpt.zip');

// Check if dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Remove old zip if exists
if (fs.existsSync(OUTPUT_FILE)) {
  fs.unlinkSync(OUTPUT_FILE);
  console.log('🗑️  Removed old zip file');
}

// Create zip
console.log('📦 Creating zip package...');
try {
  execSync(`cd dist && zip -r ../semantest-chatgpt.zip .`);
  console.log('✅ Package created: semantest-chatgpt.zip');
  
  // Show file size
  const stats = fs.statSync(OUTPUT_FILE);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 Package size: ${fileSizeInMB} MB`);
  
} catch (error) {
  console.error('❌ Failed to create package:', error.message);
  process.exit(1);
}