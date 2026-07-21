import { test, expect } from '@playwright/test';
import { askChatbot, mockChatOk } from './helpers';

test.describe('Chatbot UI (deterministic)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows core chat UI elements', async ({ page }) => {
    await expect(page.getByPlaceholder('Ask Chatbot something…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
    await expect(page.getByRole('heading', { name: 'Gemini Chatbot' })).toBeVisible();
  });

  test('keeps Send disabled for whitespace-only input', async ({ page }) => {
    await page.getByPlaceholder('Ask Chatbot something…').fill('   ');
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  test('sends a message and renders the bot reply (mocked API)', async ({ page }) => {
    await mockChatOk(page, 'Hello from mock bot');

    await askChatbot(page, 'Say hello');
    await expect(page.getByText('Say hello')).toBeVisible();
    await expect(page.getByText('Hello from mock bot')).toBeVisible();
  });

  test('shows a loading indicator while waiting for the bot', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'slow mock reply', latencyMs: 400 }),
      });
    });

    await page.getByPlaceholder('Ask Chatbot something…').fill('slow please');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByPlaceholder('Ask Chatbot something…')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();

    await expect(page.getByRole('status')).not.toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('slow mock reply')).toBeVisible();
  });

  test('keeps conversation history across multiple turns (mocked API)', async ({
    page,
  }) => {
    let turn = 0;
    await page.route('**/api/chat', async (route) => {
      turn += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: `bot-reply-${turn}`,
          latencyMs: 5,
        }),
      });
    });

    await askChatbot(page, 'first question');
    await askChatbot(page, 'second question');

    await expect(page.getByText('first question')).toBeVisible();
    await expect(page.getByText('bot-reply-1')).toBeVisible();
    await expect(page.getByText('second question')).toBeVisible();
    await expect(page.getByText('bot-reply-2')).toBeVisible();
  });

  const invalidCases = [
    {
      status: 503,
      error: 'the local model service is temporarily unavailable, please try again later',
      pattern: /temporarily unavailable/i,
    },
    {
      status: 429,
      error: 'the model rate limit was reached, please wait a moment and try again',
      pattern: /rate limit was reached/i,
    },
    {
      status: 504,
      error: 'the model took too long to respond',
      pattern: /took too long to respond/i,
    },
    {
      status: 502,
      error: 'failed to generate a response',
      pattern: /failed to generate a response/i,
    },
  ];
  for (const { status, error, pattern } of invalidCases) {
    test(`shows an error alert when the API returns ${status}`, async ({ page }) => {
      await page.route('**/api/chat', async (route) => {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ error }),
        });
      });

      const chatInputText = `trigger ${status}`;

      await askChatbot(page, chatInputText);
      await expect(page.getByRole('alert')).toContainText(pattern);
      await expect(page.getByText(chatInputText)).toBeVisible();
      await expect(page.locator('.msg-bot')).toHaveCount(0);
    });
  }

  test('clears a previous error after a successful retry', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/chat', async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'the local model service is temporarily unavailable, please try again later',
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'recovered reply', latencyMs: 8 }),
      });
    });

    await askChatbot(page, 'first attempt');
    await expect(page.getByRole('alert')).toBeVisible();

    await askChatbot(page, 'second attempt');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('recovered reply')).toBeVisible();
  });
});



