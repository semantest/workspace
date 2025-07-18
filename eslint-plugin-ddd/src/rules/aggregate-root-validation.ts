import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/types';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/semantest/eslint-plugin-ddd/blob/main/docs/rules/${name}.md`
);

interface AggregateRootOptions {
  aggregateRootSuffix: string;
  requireEventApplication: boolean;
  requireFactoryMethods: boolean;
  requireBusinessMethods: boolean;
}

export const aggregateRootValidation = createRule<[AggregateRootOptions], 
  'missingAggregateRoot' | 'missingEventApplication' | 'missingFactoryMethod' | 'missingBusinessMethods' | 'publicConstructor'>({
  name: 'aggregate-root-validation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate aggregate root patterns in DDD',
      recommended: 'error',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          aggregateRootSuffix: {
            type: 'string',
            description: 'Suffix for aggregate root classes',
          },
          requireEventApplication: {
            type: 'boolean',
            description: 'Require event application methods',
          },
          requireFactoryMethods: {
            type: 'boolean',
            description: 'Require static factory methods',
          },
          requireBusinessMethods: {
            type: 'boolean',
            description: 'Require business methods',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingAggregateRoot: 
        'Aggregate class {{className}} should extend AggregateRoot<{{className}}>',
      missingEventApplication: 
        'Aggregate root {{className}} should have an applyEvent method for domain events',
      missingFactoryMethod: 
        'Aggregate root {{className}} should have a static create factory method',
      missingBusinessMethods: 
        'Aggregate root {{className}} should have business methods, not just getters/setters',
      publicConstructor: 
        'Aggregate root {{className}} constructor should be private or protected, use factory methods instead',
    },
  },
  defaultOptions: [
    {
      aggregateRootSuffix: 'Aggregate',
      requireEventApplication: true,
      requireFactoryMethods: true,
      requireBusinessMethods: true,
    },
  ],
  create(context, [options]) {
    const isAggregateFile = (filePath: string): boolean => {
      return filePath.includes('/domain/aggregates/') || 
             filePath.endsWith('.aggregate.ts');
    };

    const isAggregateClass = (className: string): boolean => {
      return className.endsWith(options.aggregateRootSuffix) || 
             className.endsWith('Aggregate');
    };

    const extendsAggregateRoot = (node: TSESTree.ClassDeclaration): boolean => {
      if (!node.superClass) return false;
      
      if (node.superClass.type === AST_NODE_TYPES.Identifier) {
        return node.superClass.name === 'AggregateRoot';
      }
      
      if (node.superClass.type === AST_NODE_TYPES.TSTypeReference) {
        const typeName = node.superClass.typeName;
        if (typeName.type === AST_NODE_TYPES.Identifier) {
          return typeName.name === 'AggregateRoot';
        }
      }
      
      return false;
    };

    const hasApplyEventMethod = (node: TSESTree.ClassDeclaration): boolean => {
      return node.body.body.some(member => 
        member.type === AST_NODE_TYPES.MethodDefinition &&
        member.key.type === AST_NODE_TYPES.Identifier &&
        member.key.name === 'applyEvent'
      );
    };

    const hasStaticCreateMethod = (node: TSESTree.ClassDeclaration): boolean => {
      return node.body.body.some(member => 
        member.type === AST_NODE_TYPES.MethodDefinition &&
        member.static === true &&
        member.key.type === AST_NODE_TYPES.Identifier &&
        member.key.name === 'create'
      );
    };

    const hasBusinessMethods = (node: TSESTree.ClassDeclaration): boolean => {
      const methods = node.body.body.filter(member => 
        member.type === AST_NODE_TYPES.MethodDefinition &&
        member.key.type === AST_NODE_TYPES.Identifier &&
        !member.key.name.startsWith('get') &&
        !member.key.name.startsWith('set') &&
        !member.key.name.startsWith('is') &&
        !member.key.name.startsWith('has') &&
        member.key.name !== 'constructor' &&
        member.key.name !== 'equals' &&
        member.key.name !== 'hashCode' &&
        member.key.name !== 'toString' &&
        member.key.name !== 'applyEvent' &&
        member.key.name !== 'getUncommittedEvents' &&
        member.key.name !== 'markEventsAsCommitted'
      );
      
      return methods.length > 0;
    };

    const hasPublicConstructor = (node: TSESTree.ClassDeclaration): boolean => {
      const constructor = node.body.body.find(member => 
        member.type === AST_NODE_TYPES.MethodDefinition &&
        member.kind === 'constructor'
      ) as TSESTree.MethodDefinition | undefined;

      if (!constructor) return false;

      // Check if constructor has public accessibility
      return !constructor.accessibility || constructor.accessibility === 'public';
    };

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!node.id) return;

        const className = node.id.name;
        const currentFilePath = context.getFilename();

        // Only check aggregate files or classes with aggregate naming
        if (!isAggregateFile(currentFilePath) && !isAggregateClass(className)) {
          return;
        }

        // Check if class extends AggregateRoot
        if (isAggregateClass(className) && !extendsAggregateRoot(node)) {
          context.report({
            node: node.id,
            messageId: 'missingAggregateRoot',
            data: { className },
            fix(fixer) {
              if (node.superClass) {
                return fixer.replaceText(node.superClass, `AggregateRoot<${className}>`);
              } else {
                const classKeyword = context.getSourceCode().getFirstToken(node);
                const classNameToken = context.getSourceCode().getTokenAfter(classKeyword!);
                return fixer.insertTextAfter(classNameToken!, ` extends AggregateRoot<${className}>`);
              }
            },
          });
        }

        // Check for required methods if this is an aggregate
        if (isAggregateClass(className) && extendsAggregateRoot(node)) {
          // Check for applyEvent method
          if (options.requireEventApplication && !hasApplyEventMethod(node)) {
            context.report({
              node: node.id,
              messageId: 'missingEventApplication',
              data: { className },
              fix(fixer) {
                const lastBrace = context.getSourceCode().getLastToken(node);
                const applyEventMethod = `
  protected applyEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    this._updatedAt = new Date();
  }
`;
                return fixer.insertTextBefore(lastBrace!, applyEventMethod);
              },
            });
          }

          // Check for static create method
          if (options.requireFactoryMethods && !hasStaticCreateMethod(node)) {
            context.report({
              node: node.id,
              messageId: 'missingFactoryMethod',
              data: { className },
              fix(fixer) {
                const lastBrace = context.getSourceCode().getLastToken(node);
                const createMethod = `
  static create(data: Create${className}Data): Result<${className}, ValidationError> {
    // TODO: Implement validation and creation logic
    throw new Error('Not implemented');
  }
`;
                return fixer.insertTextBefore(lastBrace!, createMethod);
              },
            });
          }

          // Check for business methods
          if (options.requireBusinessMethods && !hasBusinessMethods(node)) {
            context.report({
              node: node.id,
              messageId: 'missingBusinessMethods',
              data: { className },
            });
          }

          // Check for public constructor
          if (hasPublicConstructor(node)) {
            context.report({
              node: node.id,
              messageId: 'publicConstructor',
              data: { className },
              fix(fixer) {
                const constructor = node.body.body.find(member => 
                  member.type === AST_NODE_TYPES.MethodDefinition &&
                  member.kind === 'constructor'
                ) as TSESTree.MethodDefinition;

                if (constructor) {
                  const constructorToken = context.getSourceCode().getFirstToken(constructor);
                  return fixer.insertTextBefore(constructorToken!, 'private ');
                }
                return null;
              },
            });
          }
        }
      },
    };
  },
});