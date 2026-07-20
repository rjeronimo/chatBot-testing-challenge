import { test, expect, Page } from '@playwright/test';

test.describe('Chatbot UI Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    const inputs = [
        { name: 'Say hello in Spanish in one word', value: 'Hola' },
        { name: 'Name Peru\'s capital', value: "Lima" },
        { name: 'Name number two in spanish', value: 'dos' },
    ];

    test('verify Chatbot UI elements are visible', async ({ page }) => {
        await expect(page.getByPlaceholder('Ask Chatbot something…')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send', disabled: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Gemini Chatbot' })).toBeVisible();
    });

    test('verify chat functionality', async ({ page }) => {
        await askChatbot(page, inputs[0].name);
        await expect(page.getByText(/Hola/)).toBeVisible();
    });


    test(`verify input validation for multiple inputs`, async ({ page }) => {
        for (const { name } of inputs) {
            await askChatbot(page, name);
        }

        for (const { name, value } of inputs) {
            await expect(page.getByText(name)).toBeVisible();
            await expect(page.getByText(new RegExp(value, 'i'))).toBeVisible();
        }
    });

    test('verify UI error handling for invalid input', async ({ page }) => {
        await page.route('**/api/chat', async (route) => {
            await route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Ollama is temporarily unavailable' }),
            });
        });
        await askChatbot(page, 'Invalid input test');
        await expect(page.getByText(/Ollama is temporarily unavailable/)).toBeVisible();
    });

    async function askChatbot(page: Page, question: string) {
        await page.getByPlaceholder('Ask Chatbot something…').fill(question);
        await page.getByRole('button', { name: 'Send' }).click();
        await expect(page.locator('[role="status"]')).not.toBeVisible();
    }
});
