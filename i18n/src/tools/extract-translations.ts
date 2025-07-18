#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import chalk from 'chalk';
import ora from 'ora';

interface ExtractedTranslation {
  key: string;
  namespace: string;
  file: string;
  line: number;
  defaultValue?: string;
}

/**
 * Extract translations from source files
 */
export class TranslationExtractor {
  private translations: Map<string, ExtractedTranslation[]> = new Map();
  
  constructor(
    private sourcePatterns: string[],
    private outputPath: string,
    private options: {
      defaultNamespace?: string;
      locales?: string[];
      functionNames?: string[];
    } = {}
  ) {
    this.options.defaultNamespace = this.options.defaultNamespace || 'common';
    this.options.locales = this.options.locales || ['en-US'];
    this.options.functionNames = this.options.functionNames || ['t', 'i18n.t', 'translate'];
  }
  
  /**
   * Run extraction
   */
  async extract(): Promise<void> {
    const spinner = ora('Extracting translations...').start();
    
    try {
      // Find all source files
      const files = await this.findSourceFiles();
      spinner.text = `Found ${files.length} source files`;
      
      // Extract from each file
      for (const file of files) {
        await this.extractFromFile(file);
      }
      
      spinner.text = 'Generating translation files...';
      
      // Generate translation files
      await this.generateTranslationFiles();
      
      spinner.succeed(`Extracted ${this.getTotalKeys()} translation keys`);
      
      // Report
      this.printReport();
      
    } catch (error) {
      spinner.fail('Extraction failed');
      throw error;
    }
  }
  
  /**
   * Find source files
   */
  private async findSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of this.sourcePatterns) {
      const matched = await new Promise<string[]>((resolve, reject) => {
        glob(pattern, { nodir: true }, (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      files.push(...matched);
    }
    
    return [...new Set(files)]; // Remove duplicates
  }
  
  /**
   * Extract translations from a file
   */
  private async extractFromFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Skip if no translation functions
    if (!this.options.functionNames!.some(fn => content.includes(fn))) {
      return;
    }
    
    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'optionalChaining',
          'nullishCoalescingOperator'
        ]
      });
      
      traverse(ast, {
        CallExpression: (path) => {
          const callee = path.node.callee;
          
          // Check if it's a translation function
          if (this.isTranslationFunction(callee)) {
            const extracted = this.extractTranslationCall(path.node, filePath);
            if (extracted) {
              this.addTranslation(extracted);
            }
          }
        }
      });
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not parse ${filePath}`));
    }
  }
  
  /**
   * Check if node is a translation function
   */
  private isTranslationFunction(node: any): boolean {
    const functionNames = this.options.functionNames!;
    
    // Direct function call: t()
    if (node.type === 'Identifier' && functionNames.includes(node.name)) {
      return true;
    }
    
    // Member expression: i18n.t()
    if (node.type === 'MemberExpression') {
      const memberPath = this.getMemberPath(node);
      return functionNames.includes(memberPath);
    }
    
    return false;
  }
  
  /**
   * Get member expression path
   */
  private getMemberPath(node: any): string {
    if (node.type === 'Identifier') {
      return node.name;
    }
    
    if (node.type === 'MemberExpression') {
      const objectPath = this.getMemberPath(node.object);
      return `${objectPath}.${node.property.name}`;
    }
    
    return '';
  }
  
  /**
   * Extract translation call details
   */
  private extractTranslationCall(node: any, filePath: string): ExtractedTranslation | null {
    const args = node.arguments;
    if (args.length === 0) return null;
    
    // Get key
    const keyArg = args[0];
    if (keyArg.type !== 'StringLiteral') return null;
    
    const key = keyArg.value;
    
    // Get options (3rd argument)
    const optionsArg = args[2];
    let namespace = this.options.defaultNamespace!;
    let defaultValue: string | undefined;
    
    if (optionsArg && optionsArg.type === 'ObjectExpression') {
      optionsArg.properties.forEach((prop: any) => {
        if (prop.key.name === 'namespace' && prop.value.type === 'StringLiteral') {
          namespace = prop.value.value;
        }
        if (prop.key.name === 'defaultValue' && prop.value.type === 'StringLiteral') {
          defaultValue = prop.value.value;
        }
      });
    }
    
    return {
      key,
      namespace,
      file: filePath,
      line: node.loc?.start.line || 0,
      defaultValue
    };
  }
  
  /**
   * Add translation to collection
   */
  private addTranslation(translation: ExtractedTranslation): void {
    const namespaceKey = `${translation.namespace}:${translation.key}`;
    
    if (!this.translations.has(namespaceKey)) {
      this.translations.set(namespaceKey, []);
    }
    
    this.translations.get(namespaceKey)!.push(translation);
  }
  
  /**
   * Generate translation files
   */
  private async generateTranslationFiles(): Promise<void> {
    const namespaces = this.getNamespaces();
    
    for (const locale of this.options.locales!) {
      const localePath = path.join(this.outputPath, locale);
      await fs.ensureDir(localePath);
      
      for (const namespace of namespaces) {
        await this.generateNamespaceFile(locale, namespace);
      }
    }
  }
  
  /**
   * Generate namespace file
   */
  private async generateNamespaceFile(locale: string, namespace: string): Promise<void> {
    const filePath = path.join(this.outputPath, locale, `${namespace}.json`);
    
    // Load existing translations
    let existing: any = {};
    if (await fs.pathExists(filePath)) {
      existing = await fs.readJson(filePath);
    }
    
    // Build new translations
    const translations: any = {};
    
    this.translations.forEach((occurrences, namespaceKey) => {
      const [ns, ...keyParts] = namespaceKey.split(':');
      if (ns !== namespace) return;
      
      const key = keyParts.join(':');
      const keyPath = key.split('.');
      
      // Set nested value
      let current = translations;
      for (let i = 0; i < keyPath.length - 1; i++) {
        if (!current[keyPath[i]]) {
          current[keyPath[i]] = {};
        }
        current = current[keyPath[i]];
      }
      
      const lastKey = keyPath[keyPath.length - 1];
      
      // Use existing translation or default value
      const existingValue = this.getNestedValue(existing, keyPath);
      const defaultValue = occurrences[0].defaultValue;
      
      current[lastKey] = existingValue || defaultValue || `TODO: Translate ${key}`;
    });
    
    // Merge with existing
    const merged = this.deepMerge(existing, translations);
    
    // Sort keys
    const sorted = this.sortObject(merged);
    
    // Write file
    await fs.writeJson(filePath, sorted, { spaces: 2 });
  }
  
  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string[]): any {
    let current = obj;
    for (const key of path) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return undefined;
      }
      current = current[key];
    }
    return current;
  }
  
  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  /**
   * Sort object keys recursively
   */
  private sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      sorted[key] = this.sortObject(obj[key]);
    }
    
    return sorted;
  }
  
  /**
   * Get all namespaces
   */
  private getNamespaces(): string[] {
    const namespaces = new Set<string>();
    
    this.translations.forEach((_, namespaceKey) => {
      const [namespace] = namespaceKey.split(':');
      namespaces.add(namespace);
    });
    
    return Array.from(namespaces);
  }
  
  /**
   * Get total number of keys
   */
  private getTotalKeys(): number {
    return this.translations.size;
  }
  
  /**
   * Print extraction report
   */
  private printReport(): void {
    console.log(chalk.bold('\nExtraction Report:'));
    
    const namespaces = this.getNamespaces();
    for (const namespace of namespaces) {
      const keys = Array.from(this.translations.keys())
        .filter(k => k.startsWith(`${namespace}:`));
      
      console.log(chalk.cyan(`\n${namespace}:`), `${keys.length} keys`);
      
      // Show sample keys
      keys.slice(0, 5).forEach(key => {
        const [, ...keyParts] = key.split(':');
        console.log(chalk.gray(`  - ${keyParts.join(':')}`));
      });
      
      if (keys.length > 5) {
        console.log(chalk.gray(`  ... and ${keys.length - 5} more`));
      }
    }
    
    // Show files with most translations
    const fileStats = new Map<string, number>();
    this.translations.forEach(occurrences => {
      occurrences.forEach(occ => {
        fileStats.set(occ.file, (fileStats.get(occ.file) || 0) + 1);
      });
    });
    
    const topFiles = Array.from(fileStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log(chalk.bold('\nTop files with translations:'));
    topFiles.forEach(([file, count]) => {
      console.log(chalk.gray(`  ${file}: ${count} keys`));
    });
  }
}

// CLI
if (require.main === module) {
  const extractor = new TranslationExtractor(
    [
      'src/**/*.{ts,tsx,js,jsx}',
      'pages/**/*.{ts,tsx,js,jsx}',
      'components/**/*.{ts,tsx,js,jsx}'
    ],
    'i18n/locales',
    {
      locales: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
      defaultNamespace: 'common'
    }
  );
  
  extractor.extract().catch(console.error);
}