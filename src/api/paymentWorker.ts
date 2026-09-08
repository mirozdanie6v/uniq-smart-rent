import type { D1DatabaseLike } from '../db/bootstrap.js';

type PaymentProvider = 'vietqr' | 'vnpay' | 'momo' | 'zalopay' | 'sbp' | 'yookassa' | 'tbank';

type PaymentEnv = {
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
  [key: string]: unknown;
};

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const int = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
};

const providerMeta: Record<PaymentProvider, { label: string; market: string; currency: 'VND' | 'RUB'; credentialKeys: string[] }> = {
  vietqr: { label: 'VietQR', market: 'Vietnam', currency: 'VND', credentialKeys: ['VIETQR_BANK_ID','VIETQR_ACCOUNT_NO','VIETQR_ACCOUNT_NAME'] },
  vnpay: { label: 'VNPAY', market: 'Vietnam', currency: 'VND', credentialKeys: ['VNPAY_TMN_CODE','VNPAY_HASH_SECRET'] },
  momo: { label: 'MoMo', market: 'Vietnam', currency: 'VND', credentialKeys: ['MOMO_PARTNER_CODE','MOMO_ACCESS_KEY','MOMO_SECRET_KEY'] },
  zalopay: { label: 'ZaloPay', market: 'Vietnam', currency: 'VND', credentialKeys: ['ZALOPAY_APP_ID','ZALOPAY_KEY1','ZALOPAY_KEY2'] },
  sbp: { label: 'СБП', market: 'Russia', currency: 'RUB', credentialKeys: ['SBP_MERCHANT_ID','SBP_SECRET'] },
  yookassa: { label: 'ЮKassa', market: 'Russia', currency: 'RUB', credentialKeys: ['YOOKASSA_SHOP_ID','YOOKASSA_SECRET_KEY'] },
  tbank: { label: 'T‑Bank', market: 'Russia', currency: 'RUB', credentialKeys: ['TBANK_TERMINAL_KEY','TBANK_PASSWORD'] },
};

const providers = Object.keys(providerMeta) as PaymentProvider[];

function isStaff(request: Request, env: PaymentEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  const role = request.headers.get('x-uniq-demo-role');
  return env.DEMO_MODE === 'true' && (role === 'owner' || role === 'employee');
}

function credentialReady(env: PaymentEnv, provider: PaymentProvider): boolean {
  return providerMeta[provider].credentialKeys.every((key) => typeof env[key] === 'string' && String(env[key]).trim().length > 0);
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

async function listProviders(env: PaymentEnv): Promise<Response> {
  return json({
    providers: providers.map((id) => ({
      id,
      ...providerMeta[id],
      credentialReady: credentialReady(env, id),
      checkoutMode: credentialReady(env, id) && env.DEMO_MODE !== 'true' ? 'live-ready' : 'demo',
    })),
  });
}

async function createIntent(request: Request, env: PaymentEnv): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  const payload = await parseBody(request);
  if (!payload) return json({ error: 'invalid_json' }, 400);
  const bookingId = text(payload.bookingId);
  const provider = text(payload.provider) as PaymentProvider;
  const requestedPercent = int(payload.prepaymentPercent, 100);
  if (!bookingId || !providers.includes(provider) || ![30,100].includes(requestedPercent)) return json({ error: 'invalid_payment_payload' }, 400);

  const booking = await env.DB.prepare(`SELECT id, customer_id, vehicle_id, status, estimated_total_vnd, total_vnd, paid_vnd, payment_status
    FROM bookings WHERE id = ? LIMIT 1`).bind(bookingId).first<{ id: string; customer_id: string; vehicle_id: string; status: string; estimated_total_vnd: number; total_vnd: number; paid_vnd: number; payment_status: string }>();
  if (!booking) return json({ error: 'booking_not_found' }, 404);
  if (booking.status === 'cancelled') return json({ error: 'booking_cancelled' }, 409);

  const totalVnd = Math.max(0, Number(booking.total_vnd || booking.estimated_total_vnd || 0));
  const paidVnd = Math.max(0, Number(booking.paid_vnd || 0));
  const targetPaid = requestedPercent === 100 ? totalVnd : Math.ceil(totalVnd * requestedPercent / 100);
  const amountVnd = Math.max(0, targetPaid - paidVnd);
  if (!amountVnd) return json({ error: 'nothing_to_pay', bookingId, totalVnd, paidVnd }, 409);

  const paymentId = crypto.randomUUID();
  const checkoutToken = crypto.randomUUID().replaceAll('-', '');
  const paymentReference = `UNIQ-${paymentId.split('-')[0]?.toUpperCase() ?? Date.now()}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const origin = new URL(request.url).origin;
  const paymentUrl = `${origin}/?payment=${checkoutToken}`;
  const qrPayload = paymentUrl;
  const mode = credentialReady(env, provider) && env.DEMO_MODE !== 'true' ? 'live-ready' : 'demo';

  await env.DB.prepare(`INSERT INTO payments (id, booking_id, customer_id, provider, status, currency, amount_vnd, display_amount, qr_payload, payment_url, expires_at, provider_payload_json, is_demo, payment_reference, method_label, checkout_token, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', 'VND', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(paymentId, bookingId, booking.customer_id, provider, amountVnd, amountVnd, qrPayload, paymentUrl, expiresAt, JSON.stringify({ mode, requestedPercent }), mode === 'demo' ? 1 : 0, paymentReference, providerMeta[provider].label, checkoutToken, now, now).run();

  await env.DB.prepare(`UPDATE bookings SET prepayment_percent = ?, payment_status = CASE WHEN paid_vnd > 0 THEN 'partially_paid' ELSE 'pending' END, updated_at = ? WHERE id = ?`)
    .bind(requestedPercent, now, bookingId).run();

  await env.DB.prepare(`INSERT INTO payment_events (id, payment_id, provider, event_type, payload_json, created_at) VALUES (?, ?, ?, 'intent_created', ?, ?)`)
    .bind(crypto.randomUUID(), paymentId, provider, JSON.stringify({ amountVnd, requestedPercent, mode }), now).run();

  return json({
    payment: {
      id: paymentId,
      bookingId,
      provider,
      providerLabel: providerMeta[provider].label,
      status: 'pending',
      amountVnd,
      totalVnd,
      alreadyPaidVnd: paidVnd,
      requestedPercent,
      paymentReference,
      paymentUrl,
      qrPayload,
      expiresAt,
      mode,
    },
    persisted: true,
  }, 201);
}

async function getPayment(env: PaymentEnv, paymentId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  const row = await env.DB.prepare(`SELECT id, booking_id, provider, status, amount_vnd, currency, qr_payload, payment_url, expires_at, paid_at, payment_reference, method_label, checkout_token, confirmed_at, is_demo, created_at, updated_at
    FROM payments WHERE id = ? LIMIT 1`).bind(paymentId).first<Record<string, unknown>>();
  return row ? json({ payment: row }) : json({ error: 'payment_not_found' }, 404);
}

async function listBookingPayments(request: Request, env: PaymentEnv, bookingId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isStaff(request, env) && env.DEMO_MODE !== 'true') return json({ error: 'unauthorized' }, 401);
  const rows = await env.DB.prepare(`SELECT id, booking_id, provider, status, amount_vnd, currency, payment_reference, method_label, expires_at, paid_at, confirmed_at, is_demo, created_at
    FROM payments WHERE booking_id = ? ORDER BY created_at DESC`).bind(bookingId).all<Record<string, unknown>>();
  return json({ bookingId, payments: rows.results ?? [] });
}

async function confirmDemo(env: PaymentEnv, paymentId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (env.DEMO_MODE !== 'true') return json({ error: 'demo_confirmation_disabled' }, 403);
  const payment = await env.DB.prepare(`SELECT id, booking_id, customer_id, provider, status, amount_vnd, is_demo FROM payments WHERE id = ? LIMIT 1`)
    .bind(paymentId).first<{ id: string; booking_id: string; customer_id: string; provider: string; status: string; amount_vnd: number; is_demo: number }>();
  if (!payment) return json({ error: 'payment_not_found' }, 404);
  if (payment.status === 'paid') {
    const booking = await env.DB.prepare('SELECT paid_vnd, total_vnd, payment_status FROM bookings WHERE id = ?').bind(payment.booking_id).first<Record<string, unknown>>();
    return json({ paymentId, status: 'paid', idempotent: true, booking });
  }
  if (payment.status !== 'pending' || Number(payment.is_demo) !== 1) return json({ error: 'payment_not_confirmable' }, 409);

  const now = new Date().toISOString();
  const booking = await env.DB.prepare('SELECT id, vehicle_id, total_vnd, estimated_total_vnd, paid_vnd FROM bookings WHERE id = ? LIMIT 1')
    .bind(payment.booking_id).first<{ id: string; vehicle_id: string; total_vnd: number; estimated_total_vnd: number; paid_vnd: number }>();
  if (!booking) return json({ error: 'booking_not_found' }, 404);
  const totalVnd = Math.max(0, Number(booking.total_vnd || booking.estimated_total_vnd || 0));
  const newPaid = Math.min(totalVnd, Math.max(0, Number(booking.paid_vnd || 0)) + Number(payment.amount_vnd || 0));
  const paymentStatus = newPaid >= totalVnd ? 'paid' : 'partially_paid';

  await env.DB.prepare(`UPDATE payments SET status = 'paid', paid_at = ?, confirmed_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, now, paymentId).run();
  await env.DB.prepare(`UPDATE bookings SET paid_vnd = ?, payment_status = ?, updated_at = ? WHERE id = ?`).bind(newPaid, paymentStatus, now, payment.booking_id).run();
  await env.DB.prepare(`INSERT INTO transactions (id, booking_id, payment_id, vehicle_id, customer_id, type, status, amount_vnd, method, occurred_at, note, created_at)
    VALUES (?, ?, ?, ?, ?, 'payment', 'completed', ?, ?, ?, 'Stage 5 demo payment confirmation', ?)`)
    .bind(crypto.randomUUID(), payment.booking_id, paymentId, booking.vehicle_id, payment.customer_id, payment.amount_vnd, payment.provider, now, now).run();
  await env.DB.prepare(`INSERT INTO payment_events (id, payment_id, provider, event_type, provider_event_id, payload_json, created_at) VALUES (?, ?, ?, 'demo_paid', ?, ?, ?)`)
    .bind(crypto.randomUUID(), paymentId, payment.provider, `demo-${paymentId}`, JSON.stringify({ amountVnd: payment.amount_vnd }), now).run();
  await env.DB.prepare(`INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, 'payment', ?, 'paid', ?, ?)`)
    .bind(crypto.randomUUID(), paymentId, JSON.stringify({ bookingId: payment.booking_id, amountVnd: payment.amount_vnd, provider: payment.provider }), now).run();

  return json({ paymentId, bookingId: payment.booking_id, status: 'paid', amountVnd: payment.amount_vnd, bookingPaidVnd: newPaid, bookingPaymentStatus: paymentStatus, persisted: true });
}

async function cancelPayment(request: Request, env: PaymentEnv, paymentId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isStaff(request, env) && env.DEMO_MODE !== 'true') return json({ error: 'unauthorized' }, 401);
  const row = await env.DB.prepare('SELECT id, booking_id, provider, status FROM payments WHERE id = ? LIMIT 1').bind(paymentId).first<{ id: string; booking_id: string; provider: string; status: string }>();
  if (!row) return json({ error: 'payment_not_found' }, 404);
  if (!['created','pending'].includes(row.status)) return json({ error: 'payment_not_cancellable' }, 409);
  const now = new Date().toISOString();
  await env.DB.prepare(`UPDATE payments SET status='cancelled', updated_at=? WHERE id=?`).bind(now, paymentId).run();
  await env.DB.prepare(`INSERT INTO payment_events (id, payment_id, provider, event_type, payload_json, created_at) VALUES (?, ?, ?, 'cancelled', '{}', ?)`)
    .bind(crypto.randomUUID(), paymentId, row.provider, now).run();
  return json({ paymentId, status: 'cancelled', persisted: true });
}

export async function handlePaymentRequest(request: Request, env: PaymentEnv, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/payments/providers' && request.method === 'GET') return listProviders(env);
  if (url.pathname === '/api/payments/intents' && request.method === 'POST') return createIntent(request, env);
  const paymentMatch = url.pathname.match(/^\/api\/payments\/([^/]+)$/);
  if (paymentMatch && request.method === 'GET') return getPayment(env, decodeURIComponent(paymentMatch[1] ?? ''));
  const confirmMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/demo-confirm$/);
  if (confirmMatch && request.method === 'POST') return confirmDemo(env, decodeURIComponent(confirmMatch[1] ?? ''));
  const cancelMatch = url.pathname.match(/^\/api\/payments\/([^/]+)\/cancel$/);
  if (cancelMatch && request.method === 'POST') return cancelPayment(request, env, decodeURIComponent(cancelMatch[1] ?? ''));
  const bookingPaymentsMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/payments$/);
  if (bookingPaymentsMatch && request.method === 'GET') return listBookingPayments(request, env, decodeURIComponent(bookingPaymentsMatch[1] ?? ''));
  return null;
}
