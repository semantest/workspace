import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/types';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/semantest/eslint-plugin-ddd/blob/main/docs/rules/${name}.md`
);

interface DomainBoundaryOptions {
  domainModules: string[];
  sharedKernel: string;
  allowedCrossDomainImports: string[];
}

export const domainBoundaryEnforcement = createRule<[DomainBoundaryOptions], 'domainBoundaryViolation'>({
  name: 'domain-boundary-enforcement',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce domain boundaries in DDD architecture',
      recommended: 'error',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          domainModules: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of domain modules',
          },
          sharedKernel: {
            type: 'string',
            description: 'Shared kernel module path',
          },
          allowedCrossDomainImports: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed cross-domain imports',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      domainBoundaryViolation: 
        'Domain boundary violation: {{currentDomain}} cannot import from {{targetDomain}}. ' +
        'Use integration events or shared kernel instead.',
    },
  },
  defaultOptions: [
    {
      domainModules: [
        'video.google.com',
        'pinterest.com', 
        'instagram.com',
        'unsplash.com',
        'twitter.com',
        'images.google.com'
      ],
      sharedKernel: '@semantest/core',
      allowedCrossDomainImports: [
        '@semantest/core',
        '@semantest/shared'
      ],
    },
  ],
  create(context, [options]) {
    const getCurrentDomain = (filePath: string): string | null => {
      const domainMatch = filePath.match(/@semantest\/([^\/]+)/);
      return domainMatch ? domainMatch[1] : null;
    };

    const getImportedDomain = (importPath: string): string | null => {
      const domainMatch = importPath.match(/@semantest\/([^\/]+)/);
      return domainMatch ? domainMatch[1] : null;
    };

    const isDomainModule = (domain: string): boolean => {
      return options.domainModules.includes(domain);
    };

    const isAllowedCrossDomainImport = (importPath: string): boolean => {
      return options.allowedCrossDomainImports.some(allowed => 
        importPath.startsWith(allowed)
      );
    };

    const isInfrastructureLayer = (filePath: string): boolean => {
      return filePath.includes('/infrastructure/');
    };

    const isIntegrationLayer = (filePath: string): boolean => {
      return filePath.includes('/application/integration/') || 
             filePath.includes('/application/sagas/');
    };

    const checkImportDeclaration = (node: TSESTree.ImportDeclaration): void => {
      const sourceValue = node.source.value;
      if (typeof sourceValue !== 'string') return;

      const currentFilePath = context.getFilename();
      const currentDomain = getCurrentDomain(currentFilePath);
      const targetDomain = getImportedDomain(sourceValue);

      // Skip if not importing from a domain module
      if (!currentDomain || !targetDomain) return;

      // Skip if importing from the same domain
      if (currentDomain === targetDomain) return;

      // Skip if importing from allowed cross-domain modules
      if (isAllowedCrossDomainImport(sourceValue)) return;

      // Skip if both are domain modules but current is infrastructure/integration layer
      if (isDomainModule(currentDomain) && isDomainModule(targetDomain)) {
        // Allow cross-domain imports in infrastructure and integration layers
        if (isInfrastructureLayer(currentFilePath) || isIntegrationLayer(currentFilePath)) {
          return;
        }

        // Report violation
        context.report({
          node: node.source,
          messageId: 'domainBoundaryViolation',
          data: {
            currentDomain,
            targetDomain,
          },
          fix(fixer) {
            // Suggest using integration events instead
            const suggestionComment = `// TODO: Replace direct import with integration event or shared kernel`;
            return fixer.insertTextBefore(node, `${suggestionComment}\n`);
          },
        });
      }
    };

    return {
      ImportDeclaration: checkImportDeclaration,
      CallExpression(node: TSESTree.CallExpression) {
        // Check for dynamic imports
        if (
          node.callee.type === AST_NODE_TYPES.Import &&
          node.arguments.length === 1 &&
          node.arguments[0].type === AST_NODE_TYPES.Literal
        ) {
          const sourceValue = node.arguments[0].value;
          if (typeof sourceValue === 'string') {
            const currentFilePath = context.getFilename();
            const currentDomain = getCurrentDomain(currentFilePath);
            const targetDomain = getImportedDomain(sourceValue);

            if (currentDomain && targetDomain && currentDomain !== targetDomain) {
              if (!isAllowedCrossDomainImport(sourceValue)) {
                if (isDomainModule(currentDomain) && isDomainModule(targetDomain)) {
                  if (!isInfrastructureLayer(currentFilePath) && !isIntegrationLayer(currentFilePath)) {
                    context.report({
                      node: node.arguments[0],
                      messageId: 'domainBoundaryViolation',
                      data: {
                        currentDomain,
                        targetDomain,
                      },
                    });
                  }
                }
              }
            }
          }
        }
      },
    };
  },
});