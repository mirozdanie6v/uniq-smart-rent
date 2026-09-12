export const BOT_DESCRIPTION = [
  '👋 Подберём транспорт в Нячанге?',
  '',
  'В каталоге можно посмотреть мотобайки и автомобили, цены и доступные варианты.',
  '',
  'Чтобы начать, нажмите кнопку START внизу 👇',
].join('\n');

export const WELCOME_TEXT = [
  '👋 Подберём транспорт в Нячанге?',
  '',
  'В каталоге можно посмотреть модели, цены и отправить заявку на аренду.',
  '',
  'Нажмите кнопку ниже 👇',
].join('\n');

export const FALLBACK_TEXT = [
  'Я помогу выбрать мотобайк или автомобиль, посмотреть цены и отправить заявку на аренду.',
  '',
  'Откройте каталог 👇',
].join('\n');

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function requireConfiguration(env) {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const miniAppUrl = env.TELEGRAM_MINIAPP_URL?.trim();
  if (!token || !secret || !miniAppUrl) throw new Error('telegram_not_configured');
  return { token, secret, miniAppUrl };
}

async function telegramApi(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(`telegram_${method}_failed`);
  return data.result;
}

function catalogMarkup(miniAppUrl) {
  return {
    inline_keyboard: [[{
      text: '🛵 Открыть каталог',
      web_app: { url: miniAppUrl },
    }]],
  };
}

async function sendCatalogMessage(env, chatId, message) {
  const { token, miniAppUrl } = requireConfiguration(env);
  return telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
    reply_markup: catalogMarkup(miniAppUrl),
  });
}

async function handleTelegramUpdate(request, env) {
  const { secret } = requireConfiguration(env);
  if (request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return json({ error: 'forbidden' }, 403);
  }

  const update = await request.json().catch(() => null);
  const chatId = update?.message?.chat?.id;
  const messageText = typeof update?.message?.text === 'string' ? update.message.text.trim() : '';
  if (chatId == null || !messageText) return json({ accepted: true, action: 'ignored' });

  const command = messageText.split(/\s+/, 1)[0]?.split('@', 1)[0]?.toLowerCase();
  if (command === '/start') {
    await sendCatalogMessage(env, String(chatId), WELCOME_TEXT);
    return json({ accepted: true, action: 'start_replied' });
  }

  await sendCatalogMessage(env, String(chatId), FALLBACK_TEXT);
  return json({ accepted: true, action: 'text_replied' });
}

async function configureBot(request, env) {
  const { token, secret, miniAppUrl } = requireConfiguration(env);
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'forbidden' }, 403);
  }

  const origin = new URL(request.url).origin;
  const webhookUrl = `${origin}/telegram/webhook`;
  await telegramApi(token, 'setWebhook', {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: false,
  });
  await telegramApi(token, 'setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Открыть каталог',
      web_app: { url: miniAppUrl },
    },
  });
  await telegramApi(token, 'setMyDescription', { description: BOT_DESCRIPTION });

  return json({
    configured: true,
    webhookUrl,
    miniAppUrl,
    menuButtonConfigured: true,
    descriptionConfigured: true,
    botDescription: BOT_DESCRIPTION,
  });
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  try {
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({
        ok: true,
        service: 'uniq-smart-rent-telegram-bot',
        botTokenConfigured: Boolean(env.TELEGRAM_BOT_TOKEN?.trim()),
        webhookSecretConfigured: Boolean(env.TELEGRAM_WEBHOOK_SECRET?.trim()),
        miniAppUrl: env.TELEGRAM_MINIAPP_URL?.trim() || null,
      });
    }
    if (request.method === 'POST' && url.pathname === '/telegram/webhook') {
      return handleTelegramUpdate(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/configure') {
      return configureBot(request, env);
    }
    return json({ error: 'not_found' }, 404);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown_error';
    return json({ error: code }, code === 'telegram_not_configured' ? 503 : 502);
  }
}

export default { fetch: handleRequest };
