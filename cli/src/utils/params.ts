/**
 * Parse command line parameters in key=value format
 * @param params Array of key=value strings
 * @returns Object with parsed parameters
 */
export function parseParams(params: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const param of params) {
    const [key, ...valueParts] = param.split('=');
    const value = valueParts.join('='); // Handle values with = in them

    if (!key || value === undefined) {
      throw new Error(`Invalid parameter format: ${param}. Use key=value format.`);
    }

    // Try to parse the value
    let parsedValue: any = value;

    // Handle boolean values
    if (value.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
      parsedValue = false;
    }
    // Handle numbers
    else if (!isNaN(Number(value)) && value !== '') {
      parsedValue = Number(value);
    }
    // Handle JSON objects/arrays
    else if ((value.startsWith('{') && value.endsWith('}')) || 
             (value.startsWith('[') && value.endsWith(']'))) {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        // Keep as string if JSON parse fails
      }
    }
    // Handle null
    else if (value.toLowerCase() === 'null') {
      parsedValue = null;
    }
    // Remove quotes if present
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      parsedValue = value.slice(1, -1);
    }

    result[key] = parsedValue;
  }

  return result;
}