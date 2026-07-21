import { test, expect } from '@playwright/test';
import { postChat, softPass } from './llmHelpers';

/**
 * Live Ollama checks — non-deterministic content.
 * Run with: npm run test-llm
 */
test.describe('Live Ollama chat (non-deterministic)', () => {
  test.skip(
    !process.env.RUN_LLM_TESTS,
    'Set RUN_LLM_TESTS=1 with Ollama running to enable',
  );

  test('reply is non-empty and latencyMs is a number', { tag: '@non-deterministic' }, async ({ request }) => {
    const { status, body } = await postChat(
      request,
      'Say hello in Spanish in one word',
    );

    expect(status).toBe(200);
    expect(typeof body.latencyMs).toBe('number');
    expect(body.reply.trim().length).toBeGreaterThan(0);
  });

  test('reply is roughly relevant to a Spanish greeting prompt', { tag: '@non-deterministic' }, async ({
    request,
  }) => {
    const { status, body } = await postChat(
      request,
      'Say hello in Spanish in one word. Reply with only that word.',
    );

    expect(status).toBe(200);
    expect(body.reply.toLowerCase()).toMatch(/hola|buenos|saludos|hello|hi/);
  });

  test('follows a short-format instruction (soft)', { tag: '@non-deterministic' }, async ({ request }) => {
    const { status, body } = await postChat(
      request,
      'Reply with ONLY one Spanish greeting word. No punctuation. No explanation.',
    );

    expect(status).toBe(200);
    const reply = body.reply.trim();
    expect(reply.split(/\s+/).length).toBeLessThanOrEqual(5);
    expect(reply.toLowerCase()).toMatch(/hola|buenas|saludos|hello|hi/);
  });

  test('answers a simple known fact without inventing noise (soft)', { tag: '@non-deterministic' }, async ({
    request,
  }) => {
    const { status, body } = await postChat(
      request,
      'What is 2 + 2? Reply with only the number. If unsure, say UNKNOWN.',
    );

    expect(status).toBe(200);
    expect(body.reply.trim()).toMatch(/4|UNKNOWN/i);
  });

  test('is usually consistent on a factual capital question (2 of 3)', { tag: '@non-deterministic' }, async ({
    request,
  }) => {
    await softPass(
      async () => {
        const { status, body } = await postChat(
          request,
          "What is the capital of Peru? Reply with only the city name.",
        );
        if (status !== 200) return false;
        return /lima/i.test(body.reply);
      },
      { need: 2, tries: 3 },
    );
  });
});
