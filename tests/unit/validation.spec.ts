import { test, expect } from '@playwright/test';
import { validateMessage, MAX_MESSAGE_LENGTH } from '../../src/backend/validation';

test.describe('validateMessage', () => {
  test('accepts a normal string and trims it', () => {
    const result = validateMessage('  hello  ');
    expect(result).toEqual({ ok: true, value: 'hello' });
  });

  test('rejects non-string input', () => {
    expect(validateMessage(42)).toEqual({
      ok: false,
      error: 'message must be a string',
    });
    expect(validateMessage(null)).toEqual({
      ok: false,
      error: 'message must be a string',
    });
  });

  test('rejects empty or whitespace-only input', () => {
    expect(validateMessage('')).toEqual({
      ok: false,
      error: 'message must not be empty',
    });
    expect(validateMessage('   ')).toEqual({
      ok: false,
      error: 'message must not be empty',
    });
  });

  test('rejects messages longer than MAX_MESSAGE_LENGTH', () => {
    const result = validateMessage('x'.repeat(MAX_MESSAGE_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(String(MAX_MESSAGE_LENGTH));
    }
  });

  test('accepts a message at the max length', () => {
    const value = 'x'.repeat(MAX_MESSAGE_LENGTH);
    expect(validateMessage(value)).toEqual({ ok: true, value });
  });
});
