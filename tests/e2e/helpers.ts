import { expect, Page } from "@playwright/test";

export async function askChatbot(page: Page, question: string) {
  await page.getByPlaceholder('Ask Chatbot something…').fill(question);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('[role="status"]')).not.toBeVisible({
    timeout: 60_000,
  });
}

export async function mockChatOk(page: Page, reply: string) {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply, latencyMs: 12 }),
    });
  });
}
