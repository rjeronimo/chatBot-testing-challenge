import { test, expect } from '@playwright/test';
import {
  HealthResponse,
  ChatSuccessResponse,
  ErrorResponse,
} from './interfaces';
import { startTestApp, type TestApp } from './testApp';

test.describe('Local LLM Chatbot Backend API (deterministic)', () => {
  test.describe.configure({ mode: 'serial' });

  let app: TestApp;

  test.beforeAll(async () => {
    app = await startTestApp({
      generate: async (prompt) => `echo:${prompt}`,
    });
  });

  test.afterAll(async () => {
    await app.stop();
  });

  test.describe('GET /api/health', () => {
    test('returns 200 with status and model', async () => {
      const response = await app.api.get('/api/health');

      expect(response.status()).toBe(200);

      const body = (await response.json()) as HealthResponse;
      expect(body.status).toBe('ok');
      expect(typeof body.model).toBe('string');
      expect(body.model.length).toBeGreaterThan(0);
    });
  });

  test.describe('POST /api/chat', () => {
    test('returns 200 with reply and latencyMs for valid input', async () => {
      const payload = { message: 'Say hello' };
      const response = await app.api.post('/api/chat', { data: payload });

      expect(response.status()).toBe(200);

      const body = (await response.json()) as ChatSuccessResponse;
      expect(body.reply).toBe('echo:Say hello');
      expect(typeof body.latencyMs).toBe('number');
      expect(body.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test('trims whitespace before calling generate', async () => {
      const response = await app.api.post('/api/chat', {
        data: { message: '  hi there  ' },
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ChatSuccessResponse;
      expect(body.reply).toBe('echo:hi there');
    });

    test('accepts a message at the max length', async () => {
      const message = 'A'.repeat(2000);
      const response = await app.api.post('/api/chat', { data: { message } });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as ChatSuccessResponse;
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
          const response = await app.api.post('/api/chat', { data });

          expect(response.status()).toBe(400);

          const body = (await response.json()) as ErrorResponse;
          expect(body).toHaveProperty('error');
          expect(typeof body.error).toBe('string');
          expect(body.error.length).toBeGreaterThan(0);
        });
      }
    });
  });

  test.describe('GET /api/openapi.json', () => {
    test('returns OpenAPI document with expected metadata', async () => {
      const response = await app.api.get('/api/openapi.json');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.openapi).toMatch(/^3\./);
      expect(body.info?.title).toBeTruthy();
      expect(body.paths?.['/api/health']).toBeTruthy();
      expect(body.paths?.['/api/chat']).toBeTruthy();
    });
  });
});
