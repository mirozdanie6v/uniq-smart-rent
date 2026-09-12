import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  BOT_DESCRIPTION,
  FALLBACK_TEXT,
  handleRequest,
  WELCOME_TEXT,
} from '../telegram-bot/worker.mjs';

const env = {
  TELEGRAM_BOT_TOKEN: '123456:TEST_TOKEN',
  TELEGRAM_WEBHOOK_SECRET: 'test-secret',
  TELEGRAM_MINIAPP_URL: 'https://uniq-smart-rent-demo.viiversion.com',
};

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function telegramSuccess() {
  return new Response(JSON.stringify({ ok: true, result: true }), {
    headers: { 'content-type': 'application/json' },
  });
}

function webhookRequest(message) {
  return new Request('https://bot.example/telegram/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-telegram-bot-api-secret-token': env.TELEGRAM_WEBHOOK_SECRET,
    },
    body: JSON.stringify({ message }),
  });
}

test('/start returns welcome text with a real Mini App button', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options.body)) });
    return telegramSuccess();
  };

  const response = await handleRequest(webhookRequest({ chat: { id: 101 }, text: '/start campaign' }), env);
  assert.deepEqual(await response.json(), { accepted: true, action: 'start_replied' });
  assert.equal(calls[0].body.text, WELCOME_TEXT);
  assert.deepEqual(calls[0].body.reply_markup.inline_keyboard, [[{
    text: '🛵 Открыть каталог',
    web_app: { url: env.TELEGRAM_MINIAPP_URL },
  }]]);
});

test('ordinary text receives the fallback answer and catalogue button', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options.body)) });
    return telegramSuccess();
  };

  const response = await handleRequest(webhookRequest({ chat: { id: 202 }, text: 'Что ты умеешь?' }), env);
  assert.deepEqual(await response.json(), { accepted: true, action: 'text_replied' });
  assert.equal(calls[0].body.text, FALLBACK_TEXT);
  assert.equal(calls[0].body.reply_markup.inline_keyboard[0][0].web_app.url, env.TELEGRAM_MINIAPP_URL);
});

test('configure installs webhook, bottom menu and pre-start description', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options.body)) });
    return telegramSuccess();
  };
  const response = await handleRequest(new Request('https://bot.example/configure', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.TELEGRAM_WEBHOOK_SECRET}` },
  }), env);

  const result = await response.json();
  assert.equal(result.configured, true);
  assert.equal(result.miniAppUrl, env.TELEGRAM_MINIAPP_URL);
  assert.deepEqual(calls.map(call => call.url.split('/').at(-1)), ['setWebhook', 'setChatMenuButton', 'setMyDescription']);
  assert.equal(calls[2].body.description, BOT_DESCRIPTION);
});

test('webhook rejects requests without Telegram secret header', async () => {
  const response = await handleRequest(new Request('https://bot.example/telegram/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: { chat: { id: 303 }, text: '/start' } }),
  }), env);
  assert.equal(response.status, 403);
});
