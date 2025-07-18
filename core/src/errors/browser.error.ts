import { SemantestError } from './base.error';

/**
 * Base class for browser automation errors
 */
export abstract class BrowserError extends SemantestError {
  constructor(
    message: string,
    code: string,
    public readonly url?: string,
    context?: Record<string, any>,
    recoverable: boolean = true
  ) {
    super(
      message,
      `BROWSER_${code}`,
      { ...context, url },
      recoverable,
      500
    );
  }
}

/**
 * Error thrown when element is not found
 */
export class ElementNotFoundError extends BrowserError {
  constructor(
    public readonly selector: string,
    public readonly timeout?: number,
    url?: string,
    context?: Record<string, any>
  ) {
    const timeoutMsg = timeout ? ` after ${timeout}ms` : '';
    super(
      `Element not found: ${selector}${timeoutMsg}`,
      'ELEMENT_NOT_FOUND',
      url,
      { ...context, selector, timeout },
      true
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Verify the selector is correct',
      'Check if the page has loaded completely',
      'Increase the timeout duration',
      'Check if the element is dynamically loaded',
      'Verify the element is not in an iframe'
    ];
  }
}

/**
 * Error thrown when navigation fails
 */
export class NavigationError extends BrowserError {
  constructor(
    url: string,
    reason: string,
    public readonly errorCode?: string,
    context?: Record<string, any>
  ) {
    super(
      `Failed to navigate to ${url}: ${reason}`,
      'NAVIGATION_FAILED',
      url,
      { ...context, errorCode },
      true
    );
  }

  getRecoverySuggestions(): string[] {
    const suggestions = [
      'Check if the URL is valid',
      'Verify network connectivity',
      'Check if the site is accessible'
    ];
    
    if (this.errorCode === 'ERR_NAME_NOT_RESOLVED') {
      suggestions.push('Verify the domain name is correct');
    } else if (this.errorCode === 'ERR_CONNECTION_REFUSED') {
      suggestions.push('Check if the server is running');
    } else if (this.errorCode === 'ERR_CERT_AUTHORITY_INVALID') {
      suggestions.push('The SSL certificate may be invalid');
    }
    
    return suggestions;
  }
}

/**
 * Error thrown when browser action fails
 */
export class BrowserActionError extends BrowserError {
  constructor(
    public readonly action: string,
    public readonly target?: string,
    reason: string,
    url?: string,
    context?: Record<string, any>
  ) {
    super(
      `Failed to ${action}${target ? ` on ${target}` : ''}: ${reason}`,
      'ACTION_FAILED',
      url,
      { ...context, action, target },
      true
    );
  }

  getRecoverySuggestions(): string[] {
    const suggestions = ['Wait for the element to be interactable'];
    
    switch (this.action) {
      case 'click':
        suggestions.push('Check if element is visible');
        suggestions.push('Check if element is not covered by another element');
        break;
      case 'type':
      case 'fill':
        suggestions.push('Check if element is an input field');
        suggestions.push('Check if element is not disabled');
        break;
      case 'select':
        suggestions.push('Check if element is a select dropdown');
        suggestions.push('Verify the option exists');
        break;
    }
    
    return suggestions;
  }
}

/**
 * Error thrown when page evaluation fails
 */
export class EvaluationError extends BrowserError {
  constructor(
    public readonly script: string,
    public readonly errorMessage: string,
    url?: string,
    context?: Record<string, any>
  ) {
    super(
      `Script evaluation failed: ${errorMessage}`,
      'EVALUATION_FAILED',
      url,
      { ...context, script: script.substring(0, 100) }, // Truncate long scripts
      true
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Check JavaScript syntax',
      'Verify all referenced elements exist',
      'Check browser console for errors',
      'Ensure the page context is correct'
    ];
  }
}

/**
 * Error thrown when browser context is invalid
 */
export class BrowserContextError extends BrowserError {
  constructor(
    reason: string,
    context?: Record<string, any>
  ) {
    super(
      `Browser context error: ${reason}`,
      'CONTEXT_ERROR',
      undefined,
      context,
      false
    );
  }

  getRecoverySuggestions(): string[] {
    return [
      'Restart the browser',
      'Check if browser process crashed',
      'Verify browser installation',
      'Check system resources'
    ];
  }
}