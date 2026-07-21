import { expect, type APIRequestContext } from '@playwright/test';
import type { ChatSuccessResponse } from './interfaces';

/** Soft K-of-N helper for live LLM checks (majority / threshold). */
export async function softPass(
  run: () => Promise<boolean>,
  { need = 2, tries = 3 }: { need?: number; tries?: number } = {},
): Promise<void> {
  let hits = 0;
  for (let i = 0; i < tries; i++) {
    if (await run()) hits += 1;
  }
  expect(
    hits,
    `expected at least ${need}/${tries} soft passes, got ${hits}`,
  ).toBeGreaterThanOrEqual(need);
}

export async function postChat(
  request: APIRequestContext,
  message: string,
): Promise<{ status: number; body: ChatSuccessResponse }> {
  const response = await request.post('/api/chat', { data: { message } });
  const body = (await response.json()) as ChatSuccessResponse;
  return { status: response.status(), body };
}
