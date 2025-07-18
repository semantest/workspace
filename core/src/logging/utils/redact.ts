/**
 * Utility functions for redacting sensitive data from logs
 */

/**
 * Default patterns for sensitive field detection
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /auth/i,
  /credential/i,
  /private/i,
  /ssn/i,
  /card/i,
  /cvv/i,
  /pin/i
];

/**
 * Redact sensitive data from an object
 */
export function redactSensitiveData<T extends Record<string, any>>(
  data: T,
  additionalFields?: string[]
): T {
  const fieldsToRedact = new Set(additionalFields || []);
  
  // Deep clone to avoid mutating original
  const result = JSON.parse(JSON.stringify(data));
  
  // Recursively process the object
  redactObject(result, fieldsToRedact);
  
  return result;
}

/**
 * Recursively redact sensitive fields in an object
 */
function redactObject(
  obj: Record<string, any>,
  explicitFields: Set<string>,
  path: string = ''
): void {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    // Check if field should be redacted
    if (shouldRedact(key, explicitFields)) {
      obj[key] = redactValue(value);
      continue;
    }
    
    // Recursively process nested objects and arrays
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item !== null && typeof item === 'object') {
            redactObject(item, explicitFields, `${currentPath}[${index}]`);
          }
        });
      } else {
        redactObject(value, explicitFields, currentPath);
      }
    }
  }
}

/**
 * Check if a field should be redacted
 */
function shouldRedact(fieldName: string, explicitFields: Set<string>): boolean {
  // Check explicit fields first
  if (explicitFields.has(fieldName.toLowerCase())) {
    return true;
  }
  
  // Check against sensitive patterns
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Redact a value based on its type
 */
function redactValue(value: any): string {
  if (value === null || value === undefined) {
    return '[REDACTED]';
  }
  
  const valueType = typeof value;
  
  switch (valueType) {
    case 'string':
      // Preserve some length information
      const length = value.length;
      if (length <= 4) {
        return '[REDACTED]';
      } else if (length <= 8) {
        return '[REDACTED-SHORT]';
      } else if (length <= 16) {
        return '[REDACTED-MEDIUM]';
      } else {
        return '[REDACTED-LONG]';
      }
    
    case 'number':
      return '[REDACTED-NUMBER]';
    
    case 'boolean':
      return '[REDACTED-BOOLEAN]';
    
    case 'object':
      if (Array.isArray(value)) {
        return `[REDACTED-ARRAY(${value.length})]`;
      } else {
        return '[REDACTED-OBJECT]';
      }
    
    default:
      return '[REDACTED]';
  }
}

/**
 * Mask sensitive strings (show partial data)
 */
export function maskSensitiveString(
  value: string,
  showChars: number = 4,
  maskChar: string = '*'
): string {
  if (!value || value.length <= showChars) {
    return maskChar.repeat(value?.length || 0);
  }
  
  const visiblePart = value.substring(0, showChars);
  const maskedPart = maskChar.repeat(value.length - showChars);
  
  return visiblePart + maskedPart;
}

/**
 * Redact email addresses (keep domain)
 */
export function redactEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return '[INVALID-EMAIL]';
  }
  
  const [localPart, domain] = parts;
  const redactedLocal = localPart.charAt(0) + '***';
  
  return `${redactedLocal}@${domain}`;
}

/**
 * Redact credit card numbers
 */
export function redactCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 12) {
    return '[INVALID-CARD]';
  }
  
  const last4 = cleaned.slice(-4);
  const masked = '*'.repeat(cleaned.length - 4);
  
  return `${masked}${last4}`;
}