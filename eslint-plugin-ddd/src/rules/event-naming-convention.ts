import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/types';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/semantest/eslint-plugin-ddd/blob/main/docs/rules/${name}.md`
);

interface EventNamingOptions {
  eventSuffix: string;
  eventTypeFormat: 'domain.action' | 'snake_case' | 'camelCase';
  requireEventType: boolean;
  requireCorrelationId: boolean;
  requireTimestamp: boolean;
}

export const eventNamingConvention = createRule<[EventNamingOptions], 
  'invalidEventClassName' | 'invalidEventType' | 'missingEventType' | 'missingCorrelationId' | 'missingTimestamp' | 'invalidEventStructure'>({
  name: 'event-naming-convention',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce consistent event naming conventions',
      recommended: 'error',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          eventSuffix: {
            type: 'string',
            description: 'Suffix for event classes',
          },
          eventTypeFormat: {
            type: 'string',
            enum: ['domain.action', 'snake_case', 'camelCase'],
            description: 'Format for event type strings',
          },
          requireEventType: {
            type: 'boolean',
            description: 'Require eventType property',
          },
          requireCorrelationId: {
            type: 'boolean',
            description: 'Require correlationId parameter',
          },
          requireTimestamp: {
            type: 'boolean',
            description: 'Require timestamp property',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      invalidEventClassName: 
        'Event class {{className}} should end with "{{suffix}}"',
      invalidEventType: 
        'Event type "{{eventType}}" should follow {{format}} format (e.g., "video.created", "pin.saved")',
      missingEventType: 
        'Event class {{className}} should have an eventType property',
      missingCorrelationId: 
        'Event class {{className}} should accept correlationId parameter',
      missingTimestamp: 
        'Event class {{className}} should have a timestamp property',
      invalidEventStructure: 
        'Event class {{className}} should extend DomainEvent or IntegrationEvent',
    },
  },
  defaultOptions: [
    {
      eventSuffix: 'Event',
      eventTypeFormat: 'domain.action',
      requireEventType: true,
      requireCorrelationId: true,
      requireTimestamp: true,
    },
  ],
  create(context, [options]) {
    const isEventFile = (filePath: string): boolean => {
      return filePath.includes('/events/') || 
             filePath.endsWith('.event.ts') ||
             filePath.includes('event');
    };

    const isEventClass = (className: string): boolean => {
      return className.endsWith(options.eventSuffix);
    };

    const extendsEventBase = (node: TSESTree.ClassDeclaration): boolean => {
      if (!node.superClass) return false;
      
      if (node.superClass.type === AST_NODE_TYPES.Identifier) {
        return node.superClass.name === 'DomainEvent' || 
               node.superClass.name === 'IntegrationEvent';
      }
      
      return false;
    };

    const validateEventTypeFormat = (eventType: string): boolean => {
      switch (options.eventTypeFormat) {
        case 'domain.action':
          return /^[a-z]+\.[a-z]+$/.test(eventType);
        case 'snake_case':
          return /^[a-z]+(_[a-z]+)*$/.test(eventType);
        case 'camelCase':
          return /^[a-z][a-zA-Z]*$/.test(eventType);
        default:
          return true;
      }
    };

    const getEventTypeFromConstructor = (node: TSESTree.ClassDeclaration): string | null => {
      const constructor = node.body.body.find(member => 
        member.type === AST_NODE_TYPES.MethodDefinition &&
        member.kind === 'constructor'
      ) as TSESTree.MethodDefinition | undefined;

      if (!constructor || !constructor.value.body) return null;

      // Look for super() call with event type
      const superCall = constructor.value.body.body.find(statement => 
        statement.type === AST_NODE_TYPES.ExpressionStatement &&
        statement.expression.type === AST_NODE_TYPES.CallExpression &&
        statement.expression.callee.type === AST_NODE_TYPES.Super
      ) as TSESTree.ExpressionStatement | undefined;

      if (!superCall || 
          superCall.expression.type !== AST_NODE_TYPES.CallExpression ||
          superCall.expression.arguments.length === 0) {
        return null;
      }

      const firstArg = superCall.expression.arguments[0];
      if (firstArg.type === AST_NODE_TYPES.Literal && typeof firstArg.value === 'string') {
        return firstArg.value;
      }

      return null;
    };

    const hasCorrelationIdParameter = (node: TSESTree.ClassDeclaration): boolean => {
      const constructor = node.body.body.find(member => 
        member.type === AST_NODE_TYPES.MethodDefinition &&
        member.kind === 'constructor'
      ) as TSESTree.MethodDefinition | undefined;

      if (!constructor) return false;

      return constructor.value.params.some(param => 
        param.type === AST_NODE_TYPES.Identifier &&
        param.name === 'correlationId'
      );
    };

    const hasTimestampProperty = (node: TSESTree.ClassDeclaration): boolean => {
      return node.body.body.some(member => 
        member.type === AST_NODE_TYPES.PropertyDefinition &&
        member.key.type === AST_NODE_TYPES.Identifier &&
        member.key.name === 'timestamp'
      );
    };

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!node.id) return;

        const className = node.id.name;
        const currentFilePath = context.getFilename();

        // Only check event files or classes with event naming
        if (!isEventFile(currentFilePath) && !isEventClass(className)) {
          return;
        }

        // Check class name suffix
        if (isEventFile(currentFilePath) && !isEventClass(className)) {
          context.report({
            node: node.id,
            messageId: 'invalidEventClassName',
            data: { className, suffix: options.eventSuffix },
            fix(fixer) {
              return fixer.replaceText(node.id!, `${className}${options.eventSuffix}`);
            },
          });
        }

        // Check if class extends proper event base
        if (isEventClass(className) && !extendsEventBase(node)) {
          context.report({
            node: node.id,
            messageId: 'invalidEventStructure',
            data: { className },
            fix(fixer) {
              if (node.superClass) {
                return fixer.replaceText(node.superClass, 'DomainEvent');
              } else {
                const classKeyword = context.getSourceCode().getFirstToken(node);
                const classNameToken = context.getSourceCode().getTokenAfter(classKeyword!);
                return fixer.insertTextAfter(classNameToken!, ' extends DomainEvent');
              }
            },
          });
        }

        // Check event type format
        if (isEventClass(className) && extendsEventBase(node)) {
          const eventType = getEventTypeFromConstructor(node);
          
          if (options.requireEventType && !eventType) {
            context.report({
              node: node.id,
              messageId: 'missingEventType',
              data: { className },
            });
          } else if (eventType && !validateEventTypeFormat(eventType)) {
            context.report({
              node: node.id,
              messageId: 'invalidEventType',
              data: { 
                eventType, 
                format: options.eventTypeFormat,
              },
            });
          }

          // Check for correlationId parameter
          if (options.requireCorrelationId && !hasCorrelationIdParameter(node)) {
            context.report({
              node: node.id,
              messageId: 'missingCorrelationId',
              data: { className },
              fix(fixer) {
                const constructor = node.body.body.find(member => 
                  member.type === AST_NODE_TYPES.MethodDefinition &&
                  member.kind === 'constructor'
                ) as TSESTree.MethodDefinition;

                if (constructor) {
                  const lastParam = constructor.value.params[constructor.value.params.length - 1];
                  if (lastParam) {
                    return fixer.insertTextAfter(lastParam, ', correlationId?: string');
                  }
                }
                return null;
              },
            });
          }

          // Check for timestamp property
          if (options.requireTimestamp && !hasTimestampProperty(node)) {
            context.report({
              node: node.id,
              messageId: 'missingTimestamp',
              data: { className },
              fix(fixer) {
                const openBrace = context.getSourceCode().getFirstToken(node.body);
                const timestampProperty = `
  public readonly timestamp: Date = new Date();`;
                return fixer.insertTextAfter(openBrace!, timestampProperty);
              },
            });
          }
        }
      },
    };
  },
});