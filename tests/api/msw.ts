import { expect, APIRequestContext, APIResponse } from '@playwright/test';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ErrorResponse } from './interfaces';

let currentFault: 'CONNECTION_FAILURE' | 'TIMEOUT_EXCEEDED' | 'RATE_LIMITED' | 'BUDGET_EXCEEDED' | 'SUCCESS' = 'SUCCESS';

export const mswServer = setupServer(
  http.post('**/api/chat', async () => {
    switch (currentFault) {
      case 'CONNECTION_FAILURE':
        return new HttpResponse(
          JSON.stringify({ error: 'Ollama is temporarily unavailable' }), 
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );

      case 'TIMEOUT_EXCEEDED':
      case 'BUDGET_EXCEEDED':
        return new HttpResponse(
          JSON.stringify({ error: 'Ollama took too long to respond' }), 
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      case 'RATE_LIMITED':
        return new HttpResponse(
          JSON.stringify({ error: 'rate limit was reached' }), 
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return HttpResponse.json({ message: "Hello from mock Ollama" });
    }
  })
);

export async function postWithFault(
  request: APIRequestContext, 
  faultType: typeof currentFault
): Promise<APIResponse> {
  currentFault = faultType;
  
  // Fire request. This will be caught by MSW in Node.js
  return await request.post('/api/chat', {
    data: { model: 'llama3', messages: [{ role: 'user', content: 'Hi' }] }
  });
}

export async function validateBodyErrorMessage(response: APIResponse, codeError: number, message: string) {
  expect(response.status()).toBe(codeError);
  const body = await response.json() as ErrorResponse;
  expect(body.error).toContain(message);
}
