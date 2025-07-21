import { 
  validateEvent, 
  validateEventType, 
  generateEventId, 
  createEvent 
} from '../validation';
import { ValidationError, SemantestError } from '../../types/errors';
import { BaseEvent } from '../../types/events';

describe('Validation Utilities', () => {
  describe('validateEvent', () => {
    it('should validate a valid event', () => {
      const validEvent: BaseEvent = {
        id: 'test-123',
        type: 'test.event',
        timestamp: Date.now(),
        payload: { data: 'test' }
      };

      const result = validateEvent(validEvent);
      expect(result).toEqual(validEvent);
    });

    it('should throw ValidationError when event is null', () => {
      expect(() => validateEvent(null)).toThrow('Event must be an object');
      try {
        validateEvent(null);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(SemantestError);
        expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('should throw ValidationError when event is undefined', () => {
      expect(() => validateEvent(undefined)).toThrow('Event must be an object');
      try {
        validateEvent(undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(SemantestError);
        expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('should throw ValidationError when event is not an object', () => {
      expect(() => validateEvent('string')).toThrow('Event must be an object');
      expect(() => validateEvent(123)).toThrow('Event must be an object');
      expect(() => validateEvent(true)).toThrow('Event must be an object');
      expect(() => validateEvent([])).toThrow('Event must be an object');
    });

    it('should throw ValidationError when id is missing', () => {
      const invalidEvent = {
        type: 'test.event',
        timestamp: Date.now(),
        payload: {}
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a valid id');
    });

    it('should throw ValidationError when id is not a string', () => {
      const invalidEvent = {
        id: 123,
        type: 'test.event',
        timestamp: Date.now(),
        payload: {}
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a valid id');
    });

    it('should throw ValidationError when type is missing', () => {
      const invalidEvent = {
        id: 'test-123',
        timestamp: Date.now(),
        payload: {}
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a valid type');
    });

    it('should throw ValidationError when type is not a string', () => {
      const invalidEvent = {
        id: 'test-123',
        type: 123,
        timestamp: Date.now(),
        payload: {}
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a valid type');
    });

    it('should throw ValidationError when timestamp is missing', () => {
      const invalidEvent = {
        id: 'test-123',
        type: 'test.event',
        payload: {}
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a valid timestamp');
    });

    it('should throw ValidationError when timestamp is not a number', () => {
      const invalidEvent = {
        id: 'test-123',
        type: 'test.event',
        timestamp: '2023-01-01',
        payload: {}
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a valid timestamp');
    });

    it('should throw ValidationError when payload is undefined', () => {
      const invalidEvent = {
        id: 'test-123',
        type: 'test.event',
        timestamp: Date.now(),
        payload: undefined
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a payload');
    });

    it('should throw ValidationError when payload is null', () => {
      const invalidEvent = {
        id: 'test-123',
        type: 'test.event',
        timestamp: Date.now(),
        payload: null
      };

      expect(() => validateEvent(invalidEvent)).toThrow('Event must have a payload');
    });

    it('should accept event with empty object payload', () => {
      const validEvent = {
        id: 'test-123',
        type: 'test.event',
        timestamp: Date.now(),
        payload: {}
      };

      const result = validateEvent(validEvent);
      expect(result).toEqual(validEvent);
    });

    it('should accept event with metadata', () => {
      const validEvent: BaseEvent = {
        id: 'test-123',
        type: 'test.event',
        timestamp: Date.now(),
        payload: { data: 'test' },
        metadata: {
          source: 'test-source',
          userId: 'user-123'
        }
      };

      const result = validateEvent(validEvent);
      expect(result).toEqual(validEvent);
    });

    it('should preserve event type with generic', () => {
      interface TestPayload {
        message: string;
        count: number;
      }

      const validEvent: BaseEvent<TestPayload> = {
        id: 'test-123',
        type: 'test.event',
        timestamp: Date.now(),
        payload: { message: 'hello', count: 42 }
      };

      const result = validateEvent<TestPayload>(validEvent);
      expect(result.payload.message).toBe('hello');
      expect(result.payload.count).toBe(42);
    });
  });

  describe('validateEventType', () => {
    it('should validate a valid event type', () => {
      const validTypes = [
        'test.event',
        'user.created',
        'order/placed',
        'system-event',
        'test_event',
        'Event123',
        'a',
        'TEST.EVENT.NESTED'
      ];

      validTypes.forEach(type => {
        expect(validateEventType(type)).toBe(type);
      });
    });

    it('should throw ValidationError when type is null', () => {
      expect(() => validateEventType(null)).toThrow('Event type must be a non-empty string');
    });

    it('should throw ValidationError when type is undefined', () => {
      expect(() => validateEventType(undefined)).toThrow('Event type must be a non-empty string');
    });

    it('should throw ValidationError when type is empty string', () => {
      expect(() => validateEventType('')).toThrow('Event type must be a non-empty string');
    });

    it('should throw ValidationError when type is not a string', () => {
      expect(() => validateEventType(123)).toThrow('Event type must be a non-empty string');
      expect(() => validateEventType(true)).toThrow('Event type must be a non-empty string');
      expect(() => validateEventType({})).toThrow('Event type must be a non-empty string');
      expect(() => validateEventType([])).toThrow('Event type must be a non-empty string');
    });

    it('should throw ValidationError when type contains invalid characters', () => {
      const invalidTypes = [
        'test event', // space
        'test@event', // @
        'test#event', // #
        'test$event', // $
        'test%event', // %
        'test^event', // ^
        'test&event', // &
        'test*event', // *
        'test(event', // (
        'test)event', // )
        'test=event', // =
        'test+event', // +
        'test[event', // [
        'test]event', // ]
        'test{event', // {
        'test}event', // }
        'test|event', // |
        'test\\event', // \
        'test:event', // :
        'test;event', // ;
        'test"event', // "
        'test\'event', // '
        'test<event', // <
        'test>event', // >
        'test,event', // ,
        'test?event' // ?
      ];

      invalidTypes.forEach(type => {
        expect(() => validateEventType(type)).toThrow('Event type must only contain alphanumeric characters, dots, underscores, slashes, and hyphens');
      });
    });
  });

  describe('generateEventId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
    });

    it('should generate ID with timestamp prefix', () => {
      const before = Date.now();
      const id = generateEventId();
      const after = Date.now();

      const timestamp = parseInt(id.split('-')[0]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate ID with random suffix', () => {
      const id = generateEventId();
      const parts = id.split('-');

      expect(parts.length).toBe(2);
      expect(parts[1]).toMatch(/^[a-z0-9]{9}$/);
    });

    it('should generate unique IDs in rapid succession', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateEventId());
      }

      expect(ids.size).toBe(1000);
    });
  });

  describe('createEvent', () => {
    it('should create a valid event with minimal parameters', () => {
      const type = 'test.event';
      const payload = { message: 'hello' };

      const event = createEvent(type, payload);

      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe('string');
      expect(event.type).toBe(type);
      expect(event.payload).toEqual(payload);
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeLessThanOrEqual(Date.now());
      expect(event.metadata).toBeUndefined();
    });

    it('should create event with metadata', () => {
      const type = 'test.event';
      const payload = { message: 'hello' };
      const metadata = {
        source: 'test',
        userId: 'user-123',
        custom: { key: 'value' }
      };

      const event = createEvent(type, payload, metadata);

      expect(event.metadata).toEqual(metadata);
    });

    it('should validate event type', () => {
      const payload = { message: 'hello' };

      expect(() => createEvent('', payload)).toThrow('Event type must be a non-empty string');
      expect(() => createEvent('test@event', payload)).toThrow('Event type must only contain alphanumeric characters, dots, underscores, slashes, and hyphens');
    });

    it('should preserve payload type', () => {
      interface TestPayload {
        message: string;
        count: number;
      }

      const payload: TestPayload = { message: 'hello', count: 42 };
      const event = createEvent<TestPayload>('test.event', payload);

      expect(event.payload.message).toBe('hello');
      expect(event.payload.count).toBe(42);
    });

    it('should create events with increasing timestamps', async () => {
      const event1 = createEvent('test.event', {});
      
      // Wait a millisecond to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const event2 = createEvent('test.event', {});

      expect(event2.timestamp).toBeGreaterThan(event1.timestamp);
    });

    it('should handle complex payloads', () => {
      const complexPayload = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: new Date().toISOString()
      };

      const event = createEvent('test.event', complexPayload);

      expect(event.payload).toEqual(complexPayload);
    });

    it('should handle empty metadata object', () => {
      const event = createEvent('test.event', {}, {});

      expect(event.metadata).toEqual({});
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle events with extra properties', () => {
      const eventWithExtras = {
        id: 'test-123',
        type: 'test.event',
        timestamp: Date.now(),
        payload: { data: 'test' },
        extraProp: 'should be preserved'
      };

      const result = validateEvent(eventWithExtras);
      expect(result).toEqual(eventWithExtras);
    });

    it('should handle very long event types within valid characters', () => {
      const longType = 'a'.repeat(100) + '.b'.repeat(50);
      expect(() => validateEventType(longType)).not.toThrow();
    });

    it('should handle unicode characters in payload', () => {
      const unicodePayload = {
        emoji: '🚀',
        chinese: '你好',
        arabic: 'مرحبا',
        special: '€£¥'
      };

      const event = createEvent('test.event', unicodePayload);
      expect(event.payload).toEqual(unicodePayload);
    });

    it('should handle circular references in payload', () => {
      const payload: any = { a: 1 };
      payload.circular = payload;

      // Should not throw during creation
      const event = createEvent('test.event', payload);
      expect(event.payload).toBe(payload);
    });
  });
});