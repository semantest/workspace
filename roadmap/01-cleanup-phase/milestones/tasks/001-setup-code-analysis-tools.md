# Task: Setup Code Analysis Tools

**GitHub Issue**: #001  
**Status**: Not Started  
**Assigned To**: [Developer Name]  
**Estimated Time**: 4 hours  
**Priority**: High  

## Description

Set up automated code analysis tools to identify duplicate code, complexity issues, and maintain code quality throughout the cleanup phase.

## Objectives

1. Install and configure code duplication detection tools
2. Set up complexity analysis
3. Configure linting and formatting
4. Create analysis scripts

## Implementation Steps

### 1. Install Required Tools

```bash
# Install analysis tools
npm install --save-dev \
  jscpd \
  eslint \
  prettier \
  madge \
  complexity-report \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin
```

### 2. Configure JSCPD (Copy/Paste Detector)

Create `.jscpd.json`:
```json
{
  "threshold": 5,
  "reporters": ["html", "console"],
  "ignore": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "format": ["javascript", "typescript", "jsx", "tsx"],
  "output": "./reports/duplication"
}
```

### 3. Configure ESLint

Create `.eslintrc.js`:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines': ['error', 300],
    'max-params': ['error', 4]
  }
};
```

### 4. Create Analysis Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "analyze:duplication": "jscpd .",
    "analyze:complexity": "cr --format json --output reports/complexity.json src/",
    "analyze:dependencies": "madge --circular --extensions ts,tsx src/",
    "analyze:all": "npm run analyze:duplication && npm run analyze:complexity && npm run analyze:dependencies",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  }
}
```

### 5. Create Analysis Report Script

Create `scripts/analyze-codebase.js`:
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function analyzeCodebase() {
  console.log('🔍 Starting codebase analysis...\n');

  // Create reports directory
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Run analyses
  const analyses = [
    {
      name: 'Duplication Detection',
      command: 'npm run analyze:duplication',
      output: 'reports/duplication/jscpd-report.html'
    },
    {
      name: 'Complexity Analysis',
      command: 'npm run analyze:complexity',
      output: 'reports/complexity.json'
    },
    {
      name: 'Dependency Analysis',
      command: 'npm run analyze:dependencies',
      output: 'reports/dependencies.txt'
    }
  ];

  for (const analysis of analyses) {
    console.log(`Running ${analysis.name}...`);
    try {
      execSync(analysis.command, { stdio: 'inherit' });
      console.log(`✅ ${analysis.name} completed\n`);
    } catch (error) {
      console.error(`❌ ${analysis.name} failed:`, error.message);
    }
  }

  console.log('📊 Analysis complete! Check the reports/ directory for results.');
}

analyzeCodebase();
```

## Acceptance Criteria

- [ ] JSCPD successfully identifies duplicate code blocks
- [ ] ESLint configuration catches complexity issues
- [ ] Prettier formats code consistently
- [ ] Madge identifies circular dependencies
- [ ] All analysis scripts run without errors
- [ ] Reports are generated in the `reports/` directory
- [ ] Documentation updated with tool usage

## Dependencies

- Node.js and npm installed
- Access to project repository
- Understanding of project structure

## Testing

1. Run `npm run analyze:all`
2. Verify reports are generated
3. Check that duplicate code is identified
4. Confirm circular dependencies are detected
5. Validate ESLint rules are applied

## Related Issues

- #002: Document code analysis findings
- #003: Create cleanup priority list

## Notes

- Focus on TypeScript/JavaScript files initially
- May need to adjust thresholds based on initial results
- Consider adding pre-commit hooks after validation