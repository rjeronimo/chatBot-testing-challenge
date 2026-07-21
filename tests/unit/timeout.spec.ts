import { test, expect } from '@playwright/test';
import { withTimeout, TimeoutError } from '../../src/backend/timeout';

test.describe('withTimeout', () => {
  test('resolves when the promise finishes before the budget', async () => {
    const value = await withTimeout(Promise.resolve('ok'), 200);
    expect(value).toBe('ok');
  });

  test('rejects with TimeoutError when the budget is exceeded', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 200);
    });

    await expect(withTimeout(slow, 50)).rejects.toBeInstanceOf(TimeoutError);
  });

  test('propagates the original rejection when the promise fails first', async () => {
    const failing = Promise.reject(new Error('boom'));
    await expect(withTimeout(failing, 200)).rejects.toThrow('boom');
  });
});
