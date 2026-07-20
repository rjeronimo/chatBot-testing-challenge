import { test, expect } from '@playwright/test';
import { HealthResponse, ChatSuccessResponse, ErrorResponse } from './interfaces';

test.describe('Local LLM Chatbot Backend API', () => {
  
  test.describe('GET /api/health', () => {
    test('chat should return 200 OK with correct payload structure', async ({ request }) => {
      const response = await request.get('/api/health');
      
      expect(response.status()).toBe(200);
      
      const body = await response.json() as HealthResponse;
      expect(body).toHaveProperty('status');
      expect(typeof body.status).toBe('string');
    });
  });

  test.describe('POST /api/chat', () => {
    
    test('chat should return a successful 200 model reply for valid input', async ({ request }) => {
      const payload = { message: 'Say hello in Spanish in one word' };      
      const response = await request.post('/api/chat', { data: payload });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json() as ChatSuccessResponse;
      // console.log('Chat API Response Body:', body);
      expect(typeof body.latencyMs).toBe('number');
      expect(body.reply).toContain('Hola');
    });

    test.describe('Input Validation (400 Bad Request)', () => {
      const invalidCases = [
        { name: 'missing message field', data: {} },
        { name: 'empty message string', data: { message: '' } },
        { name: 'non-string message type', data: { message: 12345 } },
        { name: 'message exceeding max length', data: { message: 'A'.repeat(2001) } }, //2000 max limit
      ];

      for (const { name, data } of invalidCases) {
        test(`should reject request when ${name}`, async ({ request }) => {
          const response = await request.post('/api/chat', { data });
          
          expect(response.status()).toBe(400);
          
          const body = await response.json() as ErrorResponse;
          expect(body).toHaveProperty('error');
          expect(typeof body.error).toBe('string');
        });
      }
    });
  });
});