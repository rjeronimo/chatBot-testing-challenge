import { test } from '@playwright/test';
import { mswServer, postWithFault, validateBodyErrorMessage } from './msw';

test.describe('Ollama Backend Edge Case Mocking', () => {
  test.beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
  
  test.afterEach(() => {
    mswServer.resetHandlers();
  });

  // Clean up when all tests complete
  test.afterAll(() => mswServer.close());

  test('should return 503 Service Unavailable when Ollama is down', async ({ request }) => {
    const response = await postWithFault(request, 'CONNECTION_FAILURE');
    await validateBodyErrorMessage(response, 503, 'temporarily unavailable');
  });

  test('should return 504 Gateway Timeout when Ollama response times out', async ({ request }) => {
    const response = await postWithFault(request, 'TIMEOUT_EXCEEDED');
    await validateBodyErrorMessage(response, 504, 'took too long to respond');
  });

  test('should return 429 Too Many Requests when upstream rate limit is hit', async ({ request }) => {
    const response = await postWithFault(request, 'RATE_LIMITED');
    await validateBodyErrorMessage(response, 429, 'rate limit was reached');
  });

  test('should return 504 Gateway Timeout when model execution exceeds timeout budget', async ({ request }) => {
    const response = await postWithFault(request, 'BUDGET_EXCEEDED');
    await validateBodyErrorMessage(response, 504, 'took too long to respond');
  });
});
