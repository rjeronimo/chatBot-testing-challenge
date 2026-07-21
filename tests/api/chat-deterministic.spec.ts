import { test, expect } from '@playwright/test';
import request from 'supertest';
import { createApp, type Generator } from '../../src/backend/app';
import type {
  HealthResponse,
  ChatSuccessResponse,
  ErrorResponse,
} from './interfaces';

/** Simulates an Ollama/upstream failure with an HTTP-like status. */
function upstreamError(status: number, message = 'upstream failed'): Generator {
  return async () => {
    const err = new Error(message) as Error & { status?: number };
    err.status = status;
    throw err;
  };
}

test.describe('Local LLM Chatbot Backend API (deterministic)', () => {
  test.describe('contracts (injected echo generate)', () => {
    const app = createApp({
      generate: async (prompt) => `echo:${prompt}`,
    });

    test.describe('GET /api/health', () => {
      test('returns 200 with status and model', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);

        const body = response.body as HealthResponse;
        expect(body.status).toBe('ok');
        expect(typeof body.model).toBe('string');
        expect(body.model.length).toBeGreaterThan(0);
      });
    });

    test.describe('POST /api/chat', () => {
      test('returns 200 with reply and latencyMs for valid input', async () => {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: 'Say hello' });

        expect(response.status).toBe(200);

        const body = response.body as ChatSuccessResponse;
        expect(body.reply).toBe('echo:Say hello');
        expect(typeof body.latencyMs).toBe('number');
        expect(body.latencyMs).toBeGreaterThanOrEqual(0);
      });

      test('trims whitespace before calling generate', async () => {
        const response = await request(app)
          .post('/api/chat')
          .send({ message: '  hi there  ' });

        expect(response.status).toBe(200);
        const body = response.body as ChatSuccessResponse;
        expect(body.reply).toBe('echo:hi there');
      });

      test('accepts a message at the max length', async () => {
        const message = 'A'.repeat(2000);
        const response = await request(app)
          .post('/api/chat')
          .send({ message });

        expect(response.status).toBe(200);
        const body = response.body as ChatSuccessResponse;
        expect(body.reply).toBe(`echo:${message}`);
      });

      test.describe('Input Validation (400 Bad Request)', () => {
        const invalidCases = [
          { name: 'missing message field', data: {} },
          { name: 'empty message string', data: { message: '' } },
          { name: 'whitespace-only message', data: { message: '   ' } },
          { name: 'non-string message type', data: { message: 12345 } },
          {
            name: 'message exceeding max length',
            data: { message: 'A'.repeat(2001) },
          },
        ];

        for (const { name, data } of invalidCases) {
          test(`rejects request when ${name}`, async () => {
            const response = await request(app).post('/api/chat').send(data);

            expect(response.status).toBe(400);

            const body = response.body as ErrorResponse;
            expect(body).toHaveProperty('error');
            expect(typeof body.error).toBe('string');
            expect(body.error.length).toBeGreaterThan(0);
          });
        }
      });
    });

    test.describe('GET /api/openapi.json', () => {
      test('returns OpenAPI document with expected metadata', async () => {
        const response = await request(app).get('/api/openapi.json');

        expect(response.status).toBe(200);
        expect(response.body.openapi).toMatch(/^3\./);
        expect(response.body.info?.title).toBeTruthy();
        expect(response.body.paths?.['/api/health']).toBeTruthy();
        expect(response.body.paths?.['/api/chat']).toBeTruthy();
      });
    });
  });

  test.describe('POST /api/chat upstream error mapping', () => {
    test('returns 503 when the local model service is unavailable', async () => {
      const app = createApp({ generate: upstreamError(503) });
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });

      expect(response.status).toBe(503);
      expect((response.body as ErrorResponse).error).toContain(
        'temporarily unavailable',
      );
    });

    test('returns 429 when the upstream rate limit is hit', async () => {
      const app = createApp({ generate: upstreamError(429) });
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });

      expect(response.status).toBe(429);
      expect((response.body as ErrorResponse).error).toContain(
        'rate limit was reached',
      );
    });

    test('returns 504 when the model exceeds the timeout budget', async () => {
      const app = createApp({
        timeoutMs: 50,
        generate: async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return 'should not reach here';
        },
      });

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });

      expect(response.status).toBe(504);
      expect((response.body as ErrorResponse).error).toContain(
        'took too long to respond',
      );
    });

    test('returns 502 for unmapped upstream failures without a status', async () => {
      const app = createApp({
        generate: async () => {
          throw new Error('unexpected upstream failure');
        },
      });

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });

      expect(response.status).toBe(502);
      expect((response.body as ErrorResponse).error).toContain(
        'failed to generate a response',
      );
    });

    test('returns 502 when upstream reports a non-mapped status like 500', async () => {
      const app = createApp({ generate: upstreamError(500) });
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });

      expect(response.status).toBe(502);
      expect((response.body as ErrorResponse).error).toContain(
        'failed to generate a response',
      );
    });
  });
});
