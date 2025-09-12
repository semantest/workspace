/**
 * Saga Orchestration
 * Manages long-running processes and compensating transactions
 */

const EventEmitter = require('events');
const { DomainEvent } = require('../../domain/events/event');

class Saga extends EventEmitter {
  constructor(sagaId, correlationId) {
    super();
    this.sagaId = sagaId;
    this.correlationId = correlationId;
    this.state = 'STARTED';
    this.currentStep = 0;
    this.steps = [];
    this.compensations = [];
    this.context = {};
    this.history = [];
    this.startedAt = new Date().toISOString();
    this.completedAt = null;
  }

  /**
   * Define a saga step with its compensation
   */
  addStep(name, handler, compensation = null) {
    this.steps.push({
      name,
      handler,
      compensation,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      result: null,
      error: null
    });
    return this;
  }

  /**
   * Execute the saga
   */
  async execute(eventStore) {
    this.state = 'RUNNING';
    this.recordEvent('SagaStarted', { sagaId: this.sagaId });

    try {
      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i;
        const step = this.steps[i];
        
        await this.executeStep(step, eventStore);
        
        if (step.status === 'FAILED') {
          await this.compensate(eventStore);
          this.state = 'COMPENSATED';
          this.recordEvent('SagaCompensated', { 
            sagaId: this.sagaId,
            failedStep: step.name 
          });
          throw new Error(`Saga failed at step: ${step.name}`);
        }
      }
      
      this.state = 'COMPLETED';
      this.completedAt = new Date().toISOString();
      this.recordEvent('SagaCompleted', { sagaId: this.sagaId });
      
      return this.context;
    } catch (error) {
      this.state = 'FAILED';
      this.recordEvent('SagaFailed', { 
        sagaId: this.sagaId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Execute a single step with retry logic
   */
  async executeStep(step, eventStore) {
    while (step.attempts < step.maxAttempts) {
      step.attempts++;
      step.status = 'EXECUTING';
      
      this.recordEvent('StepStarted', { 
        sagaId: this.sagaId,
        step: step.name,
        attempt: step.attempts 
      });
      
      try {
        step.result = await step.handler(this.context, eventStore);
        step.status = 'COMPLETED';
        
        this.recordEvent('StepCompleted', { 
          sagaId: this.sagaId,
          step: step.name 
        });
        
        // Store compensation data if needed
        if (step.compensation) {
          this.compensations.unshift({
            name: `compensate_${step.name}`,
            handler: step.compensation,
            data: step.result
          });
        }
        
        return;
      } catch (error) {
        step.error = error;
        
        this.recordEvent('StepFailed', { 
          sagaId: this.sagaId,
          step: step.name,
          attempt: step.attempts,
          error: error.message 
        });
        
        if (step.attempts >= step.maxAttempts) {
          step.status = 'FAILED';
          return;
        }
        
        // Exponential backoff
        await this.delay(Math.pow(2, step.attempts) * 1000);
      }
    }
  }

  /**
   * Execute compensating transactions
   */
  async compensate(eventStore) {
    this.recordEvent('CompensationStarted', { sagaId: this.sagaId });
    
    for (const compensation of this.compensations) {
      try {
        await compensation.handler(compensation.data, this.context, eventStore);
        
        this.recordEvent('CompensationStepCompleted', { 
          sagaId: this.sagaId,
          step: compensation.name 
        });
      } catch (error) {
        this.recordEvent('CompensationStepFailed', { 
          sagaId: this.sagaId,
          step: compensation.name,
          error: error.message 
        });
        // Continue with other compensations even if one fails
      }
    }
  }

  /**
   * Record saga events
   */
  recordEvent(eventType, data) {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      data
    };
    this.history.push(event);
    this.emit(eventType, event);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  toJSON() {
    return {
      sagaId: this.sagaId,
      correlationId: this.correlationId,
      state: this.state,
      currentStep: this.currentStep,
      steps: this.steps.map(s => ({
        name: s.name,
        status: s.status,
        attempts: s.attempts,
        error: s.error ? s.error.message : null
      })),
      context: this.context,
      history: this.history,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }
}

/**
 * Saga Manager
 * Coordinates and manages multiple sagas
 */
class SagaManager extends EventEmitter {
  constructor(eventStore) {
    super();
    this.eventStore = eventStore;
    this.sagas = new Map();
    this.sagaDefinitions = new Map();
    this.runningBySagas = new Map(); // correlationId -> saga
  }

  /**
   * Register a saga definition
   */
  registerSaga(name, definition) {
    this.sagaDefinitions.set(name, definition);
  }

  /**
   * Start a new saga
   */
  async startSaga(name, correlationId, initialContext = {}) {
    const definition = this.sagaDefinitions.get(name);
    if (!definition) {
      throw new Error(`Saga definition not found: ${name}`);
    }

    const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const saga = new Saga(sagaId, correlationId);
    saga.context = { ...initialContext };

    // Build saga from definition
    definition(saga);

    this.sagas.set(sagaId, saga);
    this.runningBySagas.set(correlationId, saga);

    // Subscribe to saga events
    saga.on('SagaCompleted', () => {
      this.runningBySagas.delete(correlationId);
      this.emit('sagaCompleted', saga);
    });

    saga.on('SagaFailed', () => {
      this.runningBySagas.delete(correlationId);
      this.emit('sagaFailed', saga);
    });

    // Record saga started event
    const startEvent = new DomainEvent(
      sagaId,
      'SagaStarted',
      {
        sagaName: name,
        correlationId,
        initialContext
      },
      { correlationId }
    );

    await this.eventStore.appendEvents(sagaId, [startEvent]);

    // Execute the saga
    try {
      const result = await saga.execute(this.eventStore);
      
      // Record saga completed event
      const completeEvent = new DomainEvent(
        sagaId,
        'SagaCompleted',
        { result },
        { correlationId }
      );
      
      await this.eventStore.appendEvents(sagaId, [completeEvent]);
      
      return result;
    } catch (error) {
      // Record saga failed event
      const failEvent = new DomainEvent(
        sagaId,
        'SagaFailed',
        { 
          error: error.message,
          sagaState: saga.toJSON()
        },
        { correlationId }
      );
      
      await this.eventStore.appendEvents(sagaId, [failEvent]);
      
      throw error;
    }
  }

  /**
   * Get saga by correlation ID
   */
  getSagaByCorrelationId(correlationId) {
    return this.runningBySagas.get(correlationId);
  }

  /**
   * Get saga by ID
   */
  getSaga(sagaId) {
    return this.sagas.get(sagaId);
  }

  /**
   * Handle event and trigger sagas
   */
  async handleEvent(event) {
    // Check if this event should trigger any sagas
    for (const [name, definition] of this.sagaDefinitions) {
      const triggerEvent = definition.triggerEvent;
      if (triggerEvent && event.eventType === triggerEvent) {
        await this.startSaga(
          name,
          event.metadata.correlationId,
          { triggerEvent: event }
        );
      }
    }
  }
}

module.exports = { Saga, SagaManager };