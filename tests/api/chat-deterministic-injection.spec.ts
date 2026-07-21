import { test, expect } from '@playwright/test';
import { startTestApp, upstreamError, type TestApp } from './testApp';
import type { ErrorResponse } from './interfaces';

test.describe('POST /api/chat upstream error mapping (deterministic)', () => {
  let app: TestApp;

  test.afterEach(async () => {
    await app?.stop();
  });

  test('returns 503 when the local model service is unavailable', async () => {
    app = await startTestApp({ generate: upstreamError(503) });
    const response = await app.api.post('/api/chat', {
      data: { message: 'hello' },
    });

    expect(response.status()).toBe(503);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error).toContain('temporarily unavailable');
  });

  test('returns 429 when the upstream rate limit is hit', async () => {
    app = await startTestApp({ generate: upstreamError(429) });
    const response = await app.api.post('/api/chat', {
      data: { message: 'hello' },
    });

    expect(response.status()).toBe(429);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error).toContain('rate limit was reached');
  });

  test('returns 504 when the model exceeds the timeout budget', async () => {
    app = await startTestApp({
      timeoutMs: 50,
      generate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 'should not reach here';
      },
    });

    const response = await app.api.post('/api/chat', {
      data: { message: 'hello' },
    });

    expect(response.status()).toBe(504);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error).toContain('took too long to respond');
  });

  test('returns 502 for unmapped upstream failures without a status', async () => {
    app = await startTestApp({
      generate: async () => {
        throw new Error('unexpected upstream failure');
      },
    });

    const response = await app.api.post('/api/chat', {
      data: { message: 'hello' },
    });

    expect(response.status()).toBe(502);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error).toContain('failed to generate a response');
  });

  test('returns 502 when upstream reports a non-mapped status like 500', async () => {
    app = await startTestApp({ generate: upstreamError(500) });
    const response = await app.api.post('/api/chat', {
      data: { message: 'hello' },
    });

    expect(response.status()).toBe(502);
    const body = (await response.json()) as ErrorResponse;
    expect(body.error).toContain('failed to generate a response');
  });
});
