import { test, expect, type Page } from '@playwright/test';
import { askChatbot } from './helpers';

/**
 * Live UI checks against a real Ollama-backed backend.
 * Run with: npm run test-llm
 */
test.describe('Chatbot UI (non-deterministic / live LLM)', () => {
  test.skip(
    !process.env.RUN_LLM_TESTS,
    'Set RUN_LLM_TESTS=1 with app + Ollama running to enable',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders a non-empty bot reply for a simple prompt', { tag: '@non-deterministic' }, async ({ page }) => {
    await askChatbot(page, 'Say hello in one short sentence.');
    const botMessages = page.locator('.msg-bot p');
    await expect(botMessages.last()).not.toHaveText('');
  });

  test('bot reply is roughly relevant to a greeting prompt', { tag: '@non-deterministic' }, async ({ page }) => {
    await askChatbot(
      page,
      'Say hello in Spanish in one word. Reply with only that word.',
    );
    const botMessages = page.locator('.msg-bot p');
    await expect(botMessages.last()).toHaveText(/hola|buenos|saludos|hello|hi/i);
  });

  test('handles complex technical questions', async ({ page }) => {
    const complexQuestions = [
      '¿Cómo funciona la teoría de la relatividad?',
      'Explica el concepto de machine learning',
      '¿Qué es la computación cuántica?'
    ];
    
    for (const question of complexQuestions) {
      await askChatbot(page, question);
      const botMessages = page.locator('.msg-bot p');
      const response = await botMessages.last().textContent() || '';
      
      expect(response.length).toBeGreaterThan(50);
    }
  });

});
