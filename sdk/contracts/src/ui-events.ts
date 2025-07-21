import { EVENT_TYPE_PREFIX } from '@semantest/core';

/**
 * UI event types
 */
export const UIEventTypes = {
  CLICK: `${EVENT_TYPE_PREFIX.UI}/click`,
  TYPE: `${EVENT_TYPE_PREFIX.UI}/type`,
  SUBMIT: `${EVENT_TYPE_PREFIX.UI}/submit`,
  SELECT: `${EVENT_TYPE_PREFIX.UI}/select`,
  FOCUS: `${EVENT_TYPE_PREFIX.UI}/focus`,
  BLUR: `${EVENT_TYPE_PREFIX.UI}/blur`,
  HOVER: `${EVENT_TYPE_PREFIX.UI}/hover`,
  SCROLL: `${EVENT_TYPE_PREFIX.UI}/scroll`,
  DRAG: `${EVENT_TYPE_PREFIX.UI}/drag`,
  DROP: `${EVENT_TYPE_PREFIX.UI}/drop`,
  UPLOAD: `${EVENT_TYPE_PREFIX.UI}/upload`
} as const;

/**
 * Element selector
 */
export interface ElementSelector {
  id?: string;
  className?: string;
  tagName?: string;
  xpath?: string;
  css?: string;
  text?: string;
  attributes?: Record<string, string>;
}

/**
 * Click event payload
 */
export interface ClickPayload {
  selector: ElementSelector;
  position?: { x: number; y: number };
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
}

/**
 * Type event payload
 */
export interface TypePayload {
  selector: ElementSelector;
  text: string;
  clear?: boolean;
  delay?: number;
}

/**
 * Submit event payload
 */
export interface SubmitPayload {
  selector: ElementSelector;
  formData?: Record<string, unknown>;
}

/**
 * Select event payload
 */
export interface SelectPayload {
  selector: ElementSelector;
  value?: string | string[];
  label?: string | string[];
  index?: number | number[];
}

/**
 * Focus/Blur event payload
 */
export interface FocusBlurPayload {
  selector: ElementSelector;
}

/**
 * Hover event payload
 */
export interface HoverPayload {
  selector: ElementSelector;
  duration?: number;
}

/**
 * Scroll event payload
 */
export interface ScrollPayload {
  selector?: ElementSelector;
  position?: { x: number; y: number };
  deltaX?: number;
  deltaY?: number;
  smooth?: boolean;
}

/**
 * Drag event payload
 */
export interface DragPayload {
  sourceSelector: ElementSelector;
  targetSelector?: ElementSelector;
  targetPosition?: { x: number; y: number };
  duration?: number;
}

/**
 * Upload event payload
 */
export interface UploadPayload {
  selector: ElementSelector;
  files: Array<{
    name: string;
    path?: string;
    content?: string;
    mimeType?: string;
  }>;
}