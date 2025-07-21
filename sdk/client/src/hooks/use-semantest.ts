import { useEffect, useRef, useState, useCallback } from 'react';
import { BaseEvent, EventHandler, EventMetadata } from '@semantest/core';
import { SemantestClient, ClientOptions } from '../semantest-client';

/**
 * Hook to create and manage a Semantest client instance
 */
export function useSemantestClient(options: ClientOptions) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<SemantestClient | null>(null);

  useEffect(() => {
    // Create client instance
    const client = new SemantestClient(options);
    clientRef.current = client;

    // Set up event handlers
    (client as any).on('connected', () => {
      setConnected(true);
      setConnecting(false);
      setError(null);
    });

    (client as any).on('disconnected', () => {
      setConnected(false);
      setConnecting(false);
    });

    const errorUnsubscribe = (client as any).on('error', (error: Error) => {
      setError(error);
    });

    // Auto-connect
    setConnecting(true);
    client.connect().catch(err => {
      setError(err);
      setConnecting(false);
    });

    // Cleanup
    return () => {
      errorUnsubscribe();
      client.disconnect();
    };
  }, [options.url]); // Only recreate if URL changes

  const send = useCallback(async <T>(
    type: string,
    payload: T,
    metadata?: EventMetadata
  ) => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }
    return clientRef.current.send(type, payload, metadata);
  }, []);

  const request = useCallback(async <TRequest, TResponse>(
    method: string,
    payload: TRequest
  ): Promise<TResponse> => {
    if (!clientRef.current) {
      throw new Error('Client not initialized');
    }
    return clientRef.current.request<TRequest, TResponse>(method, payload);
  }, []);

  return {
    client: clientRef.current,
    connected,
    connecting,
    error,
    send,
    request
  };
}

/**
 * Hook to subscribe to specific event types
 */
export function useEventSubscription<T = unknown>(
  client: SemantestClient | null,
  eventType: string,
  handler: EventHandler<T>
) {
  useEffect(() => {
    if (!client) {
      return;
    }

    const unsubscribe = client.subscribe(eventType, handler);
    return unsubscribe;
  }, [client, eventType, handler]);
}

/**
 * Hook to track the latest value of a specific event type
 */
export function useEventValue<T = unknown>(
  client: SemantestClient | null,
  eventType: string,
  initialValue?: T
) {
  const [value, setValue] = useState<T | undefined>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    setLoading(true);
    setError(null);

    const handler: EventHandler<T> = (event) => {
      setValue(event.payload);
      setLoading(false);
    };

    const errorHandler = (err: Error) => {
      setError(err);
      setLoading(false);
    };

    const unsubscribe = client.subscribe(eventType, handler);
    const unsubscribeError = (client as any).on('error', errorHandler);

    return () => {
      unsubscribe();
      unsubscribeError();
    };
  }, [client, eventType]);

  return { value, loading, error };
}

/**
 * Hook to collect events of a specific type
 */
export function useEventCollector<T = unknown>(
  client: SemantestClient | null,
  eventType: string,
  maxEvents = 100
) {
  const [events, setEvents] = useState<BaseEvent<T>[]>([]);

  useEffect(() => {
    if (!client) {
      return;
    }

    const handler: EventHandler<T> = (event) => {
      setEvents(prev => {
        const newEvents = [event, ...prev];
        return newEvents.slice(0, maxEvents);
      });
    };

    const unsubscribe = client.subscribe(eventType, handler);
    return unsubscribe;
  }, [client, eventType, maxEvents]);

  const clear = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, clear };
}

/**
 * Hook for request/response pattern
 */
export function useRequest<TRequest = any, TResponse = any>(
  client: SemantestClient | null
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResponse | null>(null);

  const execute = useCallback(async (
    method: string,
    payload: TRequest
  ): Promise<TResponse | null> => {
    if (!client) {
      setError(new Error('Client not initialized'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await client.request<TRequest, TResponse>(method, payload);
      setData(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Request failed');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return {
    execute,
    loading,
    error,
    data
  };
}