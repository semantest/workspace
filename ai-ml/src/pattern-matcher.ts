import Fuse from 'fuse.js';
import * as natural from 'natural';

/**
 * Pattern matching service for test analysis
 */
export class PatternMatcher {
  private patterns: Map<string, any[]> = new Map();
  private fuseInstances: Map<string, Fuse<any>> = new Map();
  private tfidf: natural.TfIdf;
  
  constructor() {
    this.tfidf = new natural.TfIdf();
    this.initializePatterns();
  }
  
  private initializePatterns(): void {
    // Initialize with common test patterns
    this.patterns.set('test-steps', [
      { pattern: 'click button', category: 'interaction' },
      { pattern: 'fill form', category: 'input' },
      { pattern: 'verify text', category: 'assertion' },
      { pattern: 'navigate to', category: 'navigation' }
    ]);
    
    this.patterns.set('assertions', [
      { pattern: 'should be visible', category: 'visibility' },
      { pattern: 'should contain', category: 'content' },
      { pattern: 'should equal', category: 'equality' }
    ]);
    
    // Create Fuse instances for fuzzy matching
    this.updateFuseInstances();
  }
  
  async findSimilarPatterns(features: any): Promise<any[]> {
    const results: any[] = [];
    
    // Use TF-IDF for text similarity
    if (features.text) {
      this.tfidf.addDocument(features.text);
      
      // Find similar documents
      this.patterns.forEach((patterns, category) => {
        patterns.forEach(pattern => {
          this.tfidf.addDocument(pattern.pattern);
        });
      });
      
      // Get top matches
      const similarities = this.tfidf.tfidfs(features.text);
      // Process similarities and add to results
    }
    
    // Use Fuse for fuzzy matching
    if (features.patterns) {
      features.patterns.forEach((pattern: string) => {
        this.fuseInstances.forEach((fuse, category) => {
          const matches = fuse.search(pattern);
          results.push(...matches.map(m => ({
            ...m.item,
            category,
            score: m.score
          })));
        });
      });
    }
    
    return results;
  }
  
  async updatePatterns(newPatterns: any[]): Promise<void> {
    // Add new patterns to the collection
    newPatterns.forEach(pattern => {
      const category = pattern.category || 'general';
      if (!this.patterns.has(category)) {
        this.patterns.set(category, []);
      }
      this.patterns.get(category)!.push(pattern);
    });
    
    // Update Fuse instances
    this.updateFuseInstances();
  }
  
  private updateFuseInstances(): void {
    this.patterns.forEach((patterns, category) => {
      const options = {
        keys: ['pattern', 'description'],
        threshold: 0.3,
        includeScore: true
      };
      
      this.fuseInstances.set(
        category,
        new Fuse(patterns, options)
      );
    });
  }
  
  extractStepPatterns(steps: any[]): any[] {
    return steps.map(step => ({
      action: step.action,
      target: this.generalizeTarget(step.target),
      pattern: `${step.action} ${this.generalizeTarget(step.target)}`
    }));
  }
  
  extractAssertionPatterns(assertions: any[]): any[] {
    return assertions.map(assertion => ({
      type: assertion.type,
      pattern: this.generalizeAssertion(assertion)
    }));
  }
  
  extractDataPatterns(data: any[]): any[] {
    return data.map(item => ({
      type: this.detectDataType(item.values),
      fields: Object.keys(item.values),
      patterns: this.extractValuePatterns(item.values)
    }));
  }
  
  private generalizeTarget(target: string): string {
    // Replace specific values with placeholders
    return target
      .replace(/\d+/g, '{number}')
      .replace(/["'][^"']+["']/g, '{string}')
      .replace(/\.[a-zA-Z]+/g, '.{property}')
      .replace(/#[a-zA-Z][\w-]*/g, '#{id}')
      .replace(/\[[^\]]+\]/g, '[{attribute}]');
  }
  
  private generalizeAssertion(assertion: any): string {
    const { type, target, expected } = assertion;
    const generalTarget = this.generalizeTarget(target);
    const generalExpected = typeof expected === 'string' ? 
      '{string}' : typeof expected === 'number' ? 
      '{number}' : '{value}';
    
    return `${type} ${generalTarget} ${generalExpected}`;
  }
  
  private detectDataType(values: Record<string, any>): string {
    const types = Object.values(values).map(v => typeof v);
    const uniqueTypes = [...new Set(types)];
    
    if (uniqueTypes.length === 1) {
      return uniqueTypes[0];
    }
    
    return 'mixed';
  }
  
  private extractValuePatterns(values: Record<string, any>): any[] {
    return Object.entries(values).map(([key, value]) => {
      if (typeof value === 'string') {
        return {
          field: key,
          pattern: this.detectStringPattern(value)
        };
      }
      
      return {
        field: key,
        pattern: typeof value
      };
    });
  }
  
  private detectStringPattern(value: string): string {
    if (/^\d+$/.test(value)) return 'numeric';
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return 'email';
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    if (/^https?:\/\//.test(value)) return 'url';
    if (/^\+?\d[\d\s-()]+$/.test(value)) return 'phone';
    
    return 'text';
  }
}