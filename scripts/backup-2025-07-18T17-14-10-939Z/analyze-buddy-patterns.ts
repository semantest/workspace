#!/usr/bin/env node
/*
 * Semantest Buddy Pattern Analyzer
 * Analyzes technical patterns from buddy-scan-report.json
 * Categorizes by replacement complexity for QA team
 */

import * as fs from 'fs';
import * as path from 'path';

interface PatternCategory {
  name: string;
  description: string;
  examples: string[];
  occurrences: number;
  complexity: 'simple' | 'ast' | 'manual';
  regex?: string;
  files: string[];
}

interface PatternAnalysis {
  timestamp: string;
  totalOccurrences: number;
  categories: {
    imports: PatternCategory[];
    variables: PatternCategory[];
    classesInterfaces: PatternCategory[];
    functions: PatternCategory[];
    other: PatternCategory[];
  };
  replacementStrategy: {
    simple: { count: number; percentage: number };
    ast: { count: number; percentage: number };
    manual: { count: number; percentage: number };
  };
}

// Load the scan report
const reportPath = path.join(__dirname, 'buddy-scan-report.json');
const scanReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Pattern definitions
const PATTERNS = {
  imports: {
    requireWebBuddy: {
      regex: /require\s*\(\s*['"`]@?web-buddy[^'"`]*['"`]\s*\)/g,
      description: "require() statements for web-buddy packages",
      complexity: 'simple' as const
    },
    importWebBuddy: {
      regex: /import\s+.*\s+from\s+['"`]@?web-buddy[^'"`]*['"`]/g,
      description: "ES6 import statements for web-buddy",
      complexity: 'simple' as const
    },
    importBuddy: {
      regex: /import\s+.*\s+from\s+['"`].*buddy[^'"`]*['"`]/g,
      description: "Generic buddy import statements",
      complexity: 'simple' as const
    },
    dynamicImport: {
      regex: /import\s*\(\s*['"`].*buddy[^'"`]*['"`]\s*\)/g,
      description: "Dynamic import() for buddy modules",
      complexity: 'ast' as const
    }
  },
  
  variables: {
    webBuddyClient: {
      regex: /\b(web|Web)BuddyClient\b/g,
      description: "WebBuddyClient variable/class references",
      complexity: 'simple' as const
    },
    buddyAdapter: {
      regex: /\b\w*BuddyAdapter\b/g,
      description: "BuddyAdapter pattern variables",
      complexity: 'simple' as const
    },
    buddyInstance: {
      regex: /\b(const|let|var)\s+\w*[Bb]uddy\w*\s*=/g,
      description: "Variable declarations with buddy in name",
      complexity: 'ast' as const
    },
    buddyProperty: {
      regex: /\.(web|Web)?[Bb]uddy\w*/g,
      description: "Property access with buddy names",
      complexity: 'ast' as const
    }
  },
  
  classesInterfaces: {
    interfaceWebBuddy: {
      regex: /\binterface\s+I?WebBuddy\w*/g,
      description: "Interface definitions with WebBuddy",
      complexity: 'ast' as const
    },
    classBuddy: {
      regex: /\bclass\s+\w*Buddy\w*/g,
      description: "Class definitions with Buddy in name",
      complexity: 'ast' as const
    },
    typeWebBuddy: {
      regex: /\btype\s+\w*WebBuddy\w*/g,
      description: "Type definitions with WebBuddy",
      complexity: 'ast' as const
    },
    buddyConfig: {
      regex: /\b(Web)?BuddyConfig\b/g,
      description: "Configuration type/interface references",
      complexity: 'simple' as const
    },
    genericBuddy: {
      regex: /<\w*Buddy\w*>/g,
      description: "Generic type parameters with Buddy",
      complexity: 'ast' as const
    }
  },
  
  functions: {
    initWebBuddy: {
      regex: /\binit(Web)?Buddy\s*\(/g,
      description: "Initialization functions for buddy",
      complexity: 'simple' as const
    },
    createBuddy: {
      regex: /\bcreate\w*Buddy\w*\s*\(/g,
      description: "Factory functions creating buddy instances",
      complexity: 'simple' as const
    },
    buddyMethod: {
      regex: /\.\w*[Bb]uddy\w*\s*\(/g,
      description: "Method calls with buddy in name",
      complexity: 'ast' as const
    },
    functionDecl: {
      regex: /\bfunction\s+\w*[Bb]uddy\w*/g,
      description: "Function declarations with buddy",
      complexity: 'ast' as const
    },
    asyncBuddy: {
      regex: /\basync\s+\w*[Bb]uddy\w*/g,
      description: "Async functions with buddy",
      complexity: 'ast' as const
    }
  },
  
  other: {
    comments: {
      regex: /\/\/.*buddy|\/\*.*buddy.*\*\//gi,
      description: "Comments mentioning buddy",
      complexity: 'simple' as const
    },
    strings: {
      regex: /["'`].*buddy.*["'`]/gi,
      description: "String literals containing buddy",
      complexity: 'manual' as const
    },
    urls: {
      regex: /https?:\/\/.*buddy/gi,
      description: "URLs containing buddy",
      complexity: 'manual' as const
    },
    packageJson: {
      regex: /"@?web-buddy[^"]*"\s*:/g,
      description: "package.json dependency entries",
      complexity: 'simple' as const
    },
    filePaths: {
      regex: /['"`][^'"`]*buddy[^'"`]*\.(ts|js|json)['"`]/g,
      description: "File path references with buddy",
      complexity: 'manual' as const
    }
  }
};

function analyzePatterns(): PatternAnalysis {
  const analysis: PatternAnalysis = {
    timestamp: new Date().toISOString(),
    totalOccurrences: scanReport.totalOccurrences,
    categories: {
      imports: [],
      variables: [],
      classesInterfaces: [],
      functions: [],
      other: []
    },
    replacementStrategy: {
      simple: { count: 0, percentage: 0 },
      ast: { count: 0, percentage: 0 },
      manual: { count: 0, percentage: 0 }
    }
  };
  
  // Analyze each file
  scanReport.files.forEach((file: any) => {
    file.references.forEach((ref: any) => {
      const lineText = ref.lineText;
      
      // Check each pattern category
      Object.entries(PATTERNS).forEach(([categoryName, patterns]) => {
        Object.entries(patterns).forEach(([patternName, pattern]) => {
          if (pattern.regex.test(lineText)) {
            // Find or create category entry
            const category = categoryName as keyof typeof analysis.categories;
            let patternEntry = analysis.categories[category].find(p => p.name === patternName);
            
            if (!patternEntry) {
              patternEntry = {
                name: patternName,
                description: pattern.description,
                examples: [],
                occurrences: 0,
                complexity: pattern.complexity,
                regex: pattern.regex.source,
                files: []
              };
              analysis.categories[category].push(patternEntry);
            }
            
            patternEntry.occurrences++;
            if (patternEntry.examples.length < 5 && !patternEntry.examples.includes(lineText)) {
              patternEntry.examples.push(lineText);
            }
            if (!patternEntry.files.includes(file.filePath)) {
              patternEntry.files.push(file.filePath);
            }
            
            // Update complexity counts
            analysis.replacementStrategy[pattern.complexity].count++;
          }
        });
      });
    });
  });
  
  // Calculate percentages
  const total = analysis.replacementStrategy.simple.count + 
                analysis.replacementStrategy.ast.count + 
                analysis.replacementStrategy.manual.count;
  
  if (total > 0) {
    analysis.replacementStrategy.simple.percentage = 
      Math.round((analysis.replacementStrategy.simple.count / total) * 100);
    analysis.replacementStrategy.ast.percentage = 
      Math.round((analysis.replacementStrategy.ast.count / total) * 100);
    analysis.replacementStrategy.manual.percentage = 
      Math.round((analysis.replacementStrategy.manual.count / total) * 100);
  }
  
  return analysis;
}

function generateReport(analysis: PatternAnalysis): void {
  console.log('📊 Buddy Pattern Analysis Report');
  console.log('================================\n');
  
  console.log(`📅 Analysis Date: ${new Date(analysis.timestamp).toLocaleString()}`);
  console.log(`📈 Total Occurrences Analyzed: ${analysis.totalOccurrences}\n`);
  
  console.log('🔧 Replacement Complexity Summary:');
  console.log(`  ✅ Simple Regex: ${analysis.replacementStrategy.simple.count} (${analysis.replacementStrategy.simple.percentage}%)`);
  console.log(`  🌳 AST Required: ${analysis.replacementStrategy.ast.count} (${analysis.replacementStrategy.ast.percentage}%)`);
  console.log(`  🤚 Manual Review: ${analysis.replacementStrategy.manual.count} (${analysis.replacementStrategy.manual.percentage}%)\n`);
  
  // Print each category
  const categories = [
    { name: 'imports', icon: '📦', title: 'Import Patterns' },
    { name: 'variables', icon: '📝', title: 'Variable Patterns' },
    { name: 'classesInterfaces', icon: '🏗️', title: 'Class/Interface Patterns' },
    { name: 'functions', icon: '⚡', title: 'Function Patterns' },
    { name: 'other', icon: '🔍', title: 'Other Patterns' }
  ];
  
  categories.forEach(cat => {
    const patterns = analysis.categories[cat.name as keyof typeof analysis.categories];
    if (patterns.length > 0) {
      console.log(`\n${cat.icon} ${cat.title}:`);
      console.log('─'.repeat(50));
      
      patterns.sort((a, b) => b.occurrences - a.occurrences).forEach(pattern => {
        console.log(`\n  📌 ${pattern.name} (${pattern.complexity})`);
        console.log(`     ${pattern.description}`);
        console.log(`     Occurrences: ${pattern.occurrences}`);
        console.log(`     Files affected: ${pattern.files.length}`);
        if (pattern.regex) {
          console.log(`     Regex: ${pattern.regex}`);
        }
        console.log('     Examples:');
        pattern.examples.slice(0, 3).forEach(ex => {
          console.log(`       - ${ex.trim()}`);
        });
      });
    }
  });
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'buddy-pattern-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`\n💾 Detailed analysis saved to: ${reportPath}`);
  
  // Generate QA recommendations
  generateQARecommendations(analysis);
}

function generateQARecommendations(analysis: PatternAnalysis): void {
  console.log('\n\n🎯 QA Team Recommendations');
  console.log('=========================\n');
  
  console.log('✅ SIMPLE REGEX REPLACEMENTS (Can be automated):');
  console.log('------------------------------------------------');
  const simplePatterns = Object.values(analysis.categories)
    .flat()
    .filter(p => p.complexity === 'simple' && p.occurrences > 0)
    .sort((a, b) => b.occurrences - a.occurrences);
    
  simplePatterns.forEach(p => {
    console.log(`  • ${p.name}: ${p.occurrences} occurrences`);
    console.log(`    Pattern: ${p.regex}`);
    console.log(`    Replace: Update imports, package names, config references`);
  });
  
  console.log('\n🌳 AST PARSING REQUIRED (Semi-automated with tool support):');
  console.log('----------------------------------------------------------');
  const astPatterns = Object.values(analysis.categories)
    .flat()
    .filter(p => p.complexity === 'ast' && p.occurrences > 0)
    .sort((a, b) => b.occurrences - a.occurrences);
    
  astPatterns.forEach(p => {
    console.log(`  • ${p.name}: ${p.occurrences} occurrences`);
    console.log(`    Reason: ${p.description}`);
    console.log(`    Tool: Use TypeScript AST transformer or jscodeshift`);
  });
  
  console.log('\n🤚 MANUAL INTERVENTION REQUIRED:');
  console.log('--------------------------------');
  const manualPatterns = Object.values(analysis.categories)
    .flat()
    .filter(p => p.complexity === 'manual' && p.occurrences > 0)
    .sort((a, b) => b.occurrences - a.occurrences);
    
  manualPatterns.forEach(p => {
    console.log(`  • ${p.name}: ${p.occurrences} occurrences`);
    console.log(`    Reason: ${p.description}`);
    console.log(`    Action: Review context, may be documentation or user-facing`);
  });
  
  console.log('\n📋 RECOMMENDED APPROACH:');
  console.log('1. Start with simple regex replacements (fastest wins)');
  console.log('2. Use AST tools for code structure changes');
  console.log('3. Manual review for strings, comments, and documentation');
  console.log('4. Test thoroughly after each phase');
}

// Execute analysis
const analysis = analyzePatterns();
generateReport(analysis);