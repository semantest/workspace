# Semantic Testing Implementation Guide

## Introduction

This guide provides practical instructions for implementing semantic tests in the Semantest framework. It includes examples, patterns, and best practices for creating tests that validate user intent and semantic correctness.

## Quick Start

### 1. Setting Up a Semantic Test

```typescript
import { SemanticTest, SemanticContext, Intent } from '@semantest/core';
import { GoogleImagesSemantics } from '@semantest/images.google.com';

describe('Image Search Semantic Tests', () => {
  let semanticContext: SemanticContext;
  
  beforeEach(async () => {
    semanticContext = await SemanticContext.create({
      domain: 'images.google.com',
      purpose: 'image-collection',
      constraints: {
        quality: 'high-resolution',
        relevance: 0.8
      }
    });
  });
  
  test('should understand architectural image search intent', async () => {
    // Define user intent
    const intent = new Intent({
      action: 'find-images',
      subject: 'sustainable architecture',
      purpose: 'presentation-materials',
      criteria: {
        style: 'modern',
        licensing: 'reusable',
        minResolution: { width: 1920, height: 1080 }
      }
    });
    
    // Execute semantic search
    const results = await semanticContext.execute(intent);
    
    // Validate semantic correctness
    expect(results).toSatisfyIntent(intent);
    expect(results.relevanceScore).toBeGreaterThan(0.8);
    expect(results.images).toMatchCriteria(intent.criteria);
  });
});
```

### 2. Custom Semantic Matchers

```typescript
// semantic-matchers.ts
export const semanticMatchers = {
  toSatisfyIntent(received: any, intent: Intent) {
    const satisfaction = calculateIntentSatisfaction(received, intent);
    
    return {
      pass: satisfaction.score > 0.8,
      message: () => `Expected result to satisfy intent "${intent.action}".
        Satisfaction score: ${satisfaction.score}
        Missing aspects: ${satisfaction.missing.join(', ')}`
    };
  },
  
  toMatchSemanticContext(received: any, context: SemanticContext) {
    const contextMatch = analyzeContextMatch(received, context);
    
    return {
      pass: contextMatch.isValid,
      message: () => `Expected result to match semantic context.
        Context violations: ${contextMatch.violations.join(', ')}`
    };
  }
};

// Register matchers
expect.extend(semanticMatchers);
```

## Common Patterns

### Pattern 1: User Journey Validation

```typescript
describe('Complete User Journey', () => {
  test('should maintain semantic context throughout image collection workflow', async () => {
    const journey = new UserJourney({
      persona: 'architect',
      goal: 'collect-reference-images',
      context: {
        project: 'sustainable-office-building',
        imageCount: 20,
        categories: ['exterior', 'interior', 'materials']
      }
    });
    
    // Step 1: Search initiation
    const searchPhase = await journey.beginPhase('search');
    await searchPhase.execute({
      query: 'sustainable office architecture',
      filters: { license: 'commercial-use' }
    });
    
    expect(searchPhase.results).toAlignWithPersona('architect');
    expect(searchPhase.results).toMatchProjectContext(journey.context);
    
    // Step 2: Image selection
    const selectionPhase = await journey.beginPhase('selection');
    const selectedImages = await selectionPhase.selectImages({
      strategy: 'diverse-examples',
      distribution: journey.context.categories
    });
    
    expect(selectedImages).toCoverAllCategories(journey.context.categories);
    expect(selectedImages).toMaintainQualityThreshold(0.85);
    
    // Step 3: Download and organization
    const downloadPhase = await journey.beginPhase('download');
    const collection = await downloadPhase.downloadAndOrganize(selectedImages);
    
    expect(collection).toBeCompleteForGoal(journey.goal);
    expect(collection.metadata).toPreserveSemanticContext();
  });
});
```

### Pattern 2: Cross-Domain Semantic Validation

```typescript
describe('Cross-Domain Semantics', () => {
  test('should transfer image context to text generation', async () => {
    // Domain 1: Image Search
    const imageContext = await GoogleImagesSemantics.search({
      query: 'minimalist web design',
      intent: 'design-inspiration'
    });
    
    const selectedImage = imageContext.selectBest({
      criteria: 'most-representative'
    });
    
    // Domain 2: ChatGPT Integration
    const textContext = await ChatGPTSemantics.createContext({
      reference: selectedImage,
      task: 'describe-design-principles'
    });
    
    const description = await textContext.generateDescription();
    
    // Validate semantic transfer
    expect(description).toReflectImageElements(selectedImage);
    expect(description.concepts).toInclude(imageContext.dominantThemes);
    expect(description.tone).toMatchDomain('design-professional');
  });
});
```

### Pattern 3: Pattern Learning Validation

```typescript
describe('Pattern Learning', () => {
  test('should learn and apply user preferences', async () => {
    const learningSession = new PatternLearningSession({
      user: 'test-user',
      domain: 'images.google.com'
    });
    
    // Training phase
    const trainingData = [
      { selected: 'modern-architecture.jpg', rejected: ['classical-arch.jpg'] },
      { selected: 'glass-building.jpg', rejected: ['brick-building.jpg'] },
      { selected: 'sustainable-design.jpg', rejected: ['traditional.jpg'] }
    ];
    
    await learningSession.train(trainingData);
    
    // Validation phase
    const newResults = await generateTestResults();
    const predictions = await learningSession.predict(newResults);
    
    expect(predictions.topChoice).toMatchUserPreference('modern-sustainable');
    expect(predictions.confidence).toBeGreaterThan(0.75);
    
    // Apply learned patterns
    const automatedSelection = await learningSession.autoSelect(newResults);
    expect(automatedSelection).toAlignWithLearnedPreferences();
  });
});
```

## Advanced Techniques

### 1. Semantic Equivalence Testing

```typescript
export class SemanticEquivalenceTester {
  async testEquivalence(
    implementation1: SemanticImplementation,
    implementation2: SemanticImplementation,
    testCases: EquivalenceTestCase[]
  ) {
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const result1 = await implementation1.execute(testCase.input);
        const result2 = await implementation2.execute(testCase.input);
        
        return {
          testCase: testCase.name,
          semanticallyEquivalent: this.areEquivalent(result1, result2),
          differences: this.extractDifferences(result1, result2)
        };
      })
    );
    
    return {
      overallEquivalence: this.calculateOverallEquivalence(results),
      criticalDifferences: this.identifyCriticalDifferences(results)
    };
  }
}
```

### 2. Semantic Mutation Testing

```typescript
describe('Semantic Mutation Testing', () => {
  test('should detect semantic mutations', async () => {
    const originalIntent = new Intent({
      action: 'find-images',
      criteria: { style: 'modern', color: 'green' }
    });
    
    const semanticMutations = [
      { mutate: 'style', to: 'classical' },  // Semantic opposite
      { mutate: 'color', to: 'blue' },       // Semantic variation
      { remove: 'style' },                   // Semantic weakening
      { add: { mood: 'serene' } }           // Semantic enrichment
    ];
    
    for (const mutation of semanticMutations) {
      const mutatedIntent = applyMutation(originalIntent, mutation);
      const result = await semanticEngine.execute(mutatedIntent);
      
      // Tests should detect the semantic change
      expect(result).not.toSatisfyIntent(originalIntent);
      expect(result).toReflectMutation(mutation);
    }
  });
});
```

### 3. Semantic Coverage Analysis

```typescript
export class SemanticCoverageAnalyzer {
  async analyzeCoverage(testSuite: TestSuite): Promise<SemanticCoverage> {
    const coverage = {
      intents: new Set<string>(),
      contexts: new Set<string>(),
      domains: new Set<string>(),
      userPersonas: new Set<string>(),
      edgeCases: new Set<string>()
    };
    
    // Analyze each test
    for (const test of testSuite.tests) {
      const semantics = await this.extractSemantics(test);
      coverage.intents.add(semantics.intent);
      coverage.contexts.add(semantics.context);
      coverage.domains.add(semantics.domain);
      coverage.userPersonas.add(semantics.persona);
      semantics.edgeCases.forEach(ec => coverage.edgeCases.add(ec));
    }
    
    return {
      intentCoverage: this.calculateCoverage(coverage.intents, this.allPossibleIntents),
      contextCoverage: this.calculateCoverage(coverage.contexts, this.allPossibleContexts),
      domainCoverage: this.calculateCoverage(coverage.domains, this.allDomains),
      personaCoverage: this.calculateCoverage(coverage.userPersonas, this.allPersonas),
      edgeCaseCoverage: this.calculateCoverage(coverage.edgeCases, this.knownEdgeCases),
      overallScore: this.calculateOverallScore(coverage)
    };
  }
}
```

## Best Practices

### 1. Structure Tests by User Intent

```typescript
describe('User Intent: Research', () => {
  describe('Academic Research', () => {
    test('should support citation-ready image collection', async () => {
      // Test implementation
    });
  });
  
  describe('Market Research', () => {
    test('should enable competitor analysis through images', async () => {
      // Test implementation
    });
  });
});
```

### 2. Use Semantic Fixtures

```typescript
// fixtures/semantic-contexts.ts
export const semanticFixtures = {
  architect: {
    intent: 'design-inspiration',
    preferences: {
      style: ['modern', 'sustainable', 'minimalist'],
      quality: 'professional',
      licensing: 'commercial-use'
    }
  },
  researcher: {
    intent: 'academic-reference',
    preferences: {
      credibility: 'high',
      attribution: 'required',
      format: 'high-resolution'
    }
  }
};
```

### 3. Implement Semantic Assertions

```typescript
export function createSemanticAssertions(domain: string) {
  return {
    assertIntent(actual: any, expected: Intent) {
      if (!this.matchesIntent(actual, expected)) {
        throw new Error(`
          Semantic assertion failed:
          Expected intent: ${expected.describe()}
          Actual result: ${this.describeActual(actual)}
          Semantic gap: ${this.analyzeGap(actual, expected)}
        `);
      }
    },
    
    assertContext(actual: any, expected: Context) {
      // Similar implementation
    },
    
    assertOutcome(actual: any, expected: Outcome) {
      // Similar implementation
    }
  };
}
```

## Debugging Semantic Tests

### 1. Semantic Diff Tool

```typescript
export class SemanticDiff {
  static compare(expected: SemanticResult, actual: SemanticResult): DiffReport {
    return {
      intentAlignment: this.compareIntents(expected.intent, actual.intent),
      contextPreservation: this.compareContexts(expected.context, actual.context),
      outcomeAchievement: this.compareOutcomes(expected.outcome, actual.outcome),
      suggestions: this.generateSuggestions(expected, actual)
    };
  }
}
```

### 2. Semantic Test Reporter

```typescript
export class SemanticTestReporter {
  onTestComplete(test: SemanticTest, result: TestResult) {
    console.log(`
      Semantic Test: ${test.name}
      Intent: ${test.intent.describe()}
      Outcome: ${result.passed ? '✓' : '✗'} ${result.outcome}
      Semantic Score: ${result.semanticScore}/100
      ${result.insights ? `Insights: ${result.insights}` : ''}
    `);
  }
}
```

## Integration with CI/CD

### GitHub Actions Configuration

```yaml
name: Semantic Tests
on: [push, pull_request]

jobs:
  semantic-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Semantest
        run: |
          npm install -g @semantest/cli
          semantest init
      
      - name: Run Semantic Tests
        run: |
          semantest test \
            --semantic-coverage 80 \
            --intent-validation strict \
            --cross-domain enabled
      
      - name: Upload Semantic Coverage Report
        uses: actions/upload-artifact@v2
        with:
          name: semantic-coverage
          path: coverage/semantic-report.html
```

## Conclusion

Semantic testing in Semantest goes beyond traditional functional testing to validate that automated actions align with user intent and preserve semantic meaning. By following this guide, you can create tests that ensure your web automation truly serves user needs while maintaining the flexibility to evolve with changing requirements.

Remember: The goal is not just to test that something works, but to validate that it works in a way that's meaningful to users.