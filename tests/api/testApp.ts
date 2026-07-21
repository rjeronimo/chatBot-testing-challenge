import type { Server } from 'node:http';
import {
  request as playwrightRequest,
  type APIRequestContext,
} from '@playwright/test';
import { createApp, type AppOptions, type Generator } from '../../src/backend/app';

export interface TestApp {
  baseURL: string;
  api: APIRequestContext;
  stop: () => Promise<void>;
}

/** Starts an Express app on an ephemeral port with optional LLM injection. */
export async function startTestApp(options: AppOptions = {}): Promise<TestApp> {
  const app = createApp(options);
  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind test server');
  }

  const baseURL = `http://127.0.0.1:${address.port}`;
  const api = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return {
    baseURL,
    api,
    async stop() {
      await api.dispose();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

/** Simulates an Ollama/upstream failure with an HTTP-like status. */
export function upstreamError(status: number, message = 'upstream failed'): Generator {
  return async () => {
    const err = new Error(message) as Error & { status?: number };
    err.status = status;
    throw err;
  };
}
