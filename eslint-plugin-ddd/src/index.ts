import { ESLintUtils } from '@typescript-eslint/utils';

import { domainBoundaryEnforcement } from './rules/domain-boundary-enforcement';
import { aggregateRootValidation } from './rules/aggregate-root-validation';
import { eventNamingConvention } from './rules/event-naming-convention';
import { valueObjectImmutability } from './rules/value-object-immutability';
import { repositoryPatternCompliance } from './rules/repository-pattern-compliance';
import { noAnemicDomainModels } from './rules/no-anemic-domain-models';
import { domainServiceValidation } from './rules/domain-service-validation';
import { integrationEventStructure } from './rules/integration-event-structure';
import { antiCorruptionLayerValidation } from './rules/anti-corruption-layer-validation';
import { errorHandlingConsistency } from './rules/error-handling-consistency';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/semantest/eslint-plugin-ddd/blob/main/docs/rules/${name}.md`
);

export const rules = {
  'domain-boundary-enforcement': domainBoundaryEnforcement,
  'aggregate-root-validation': aggregateRootValidation,
  'event-naming-convention': eventNamingConvention,
  'value-object-immutability': valueObjectImmutability,
  'repository-pattern-compliance': repositoryPatternCompliance,
  'no-anemic-domain-models': noAnemicDomainModels,
  'domain-service-validation': domainServiceValidation,
  'integration-event-structure': integrationEventStructure,
  'anti-corruption-layer-validation': antiCorruptionLayerValidation,
  'error-handling-consistency': errorHandlingConsistency,
};

export const configs = {
  recommended: {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.json',
    },
    plugins: ['@semantest/ddd'],
    rules: {
      '@semantest/ddd/domain-boundary-enforcement': 'error',
      '@semantest/ddd/aggregate-root-validation': 'error',
      '@semantest/ddd/event-naming-convention': 'error',
      '@semantest/ddd/value-object-immutability': 'error',
      '@semantest/ddd/repository-pattern-compliance': 'error',
      '@semantest/ddd/no-anemic-domain-models': 'warn',
      '@semantest/ddd/domain-service-validation': 'error',
      '@semantest/ddd/integration-event-structure': 'error',
      '@semantest/ddd/anti-corruption-layer-validation': 'error',
      '@semantest/ddd/error-handling-consistency': 'error',
    },
  },
  strict: {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.json',
    },
    plugins: ['@semantest/ddd'],
    rules: {
      '@semantest/ddd/domain-boundary-enforcement': 'error',
      '@semantest/ddd/aggregate-root-validation': 'error',
      '@semantest/ddd/event-naming-convention': 'error',
      '@semantest/ddd/value-object-immutability': 'error',
      '@semantest/ddd/repository-pattern-compliance': 'error',
      '@semantest/ddd/no-anemic-domain-models': 'error',
      '@semantest/ddd/domain-service-validation': 'error',
      '@semantest/ddd/integration-event-structure': 'error',
      '@semantest/ddd/anti-corruption-layer-validation': 'error',
      '@semantest/ddd/error-handling-consistency': 'error',
    },
  },
};

export { createRule };