import fs from 'node:fs';

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

const appPath='src/features/prototype/PrototypeApp.tsx';
let app=fs.readFileSync(appPath,'utf8');
app=replaceRequired(app,
  "import { OwnerBookingCalendar } from '../bookings/OwnerBookingCalendar';\nimport { fetchFleetOverrides } from '../../api/ownerFleet';",
  "import { OwnerBookingCalendar } from '../bookings/OwnerBookingCalendar';\nimport { PaymentCheckout } from '../payments/PaymentCheckout';\nimport { fetchFleetOverrides } from '../../api/ownerFleet';\nimport { createPersistedBooking, PaymentProvider } from '../../api/payments';",
  'payment imports');
app=replaceRequired(app,
  "  createdAt: string;\n}",
  "  createdAt: string;\n  backendBookingId?: string;\n  paymentStatus?: 'unpaid' | 'pending' | 'partially_paid' | 'paid';\n  paymentId?: string;\n  paymentProvider?: PaymentProvider;\n}",
  'rental payment fields');
app=replaceRequired(app,
  "const statusText = (status: RequestStatus) => ({ new:'Новая', contacted:'Связались', confirmed:'Подтверждена', issued:'Выдана', active:'В аренде', returned:'Возвращена', completed:'Завершена', cancelled:'Отменена' })[status];",
  "const statusText = (status: RequestStatus) => ({ new:'Новая', contacted:'Связались', confirmed:'Подтверждена', issued:'Выдана', active:'В аренде', returned:'Возвращена', completed:'Завершена', cancelled:'Отменена' })[status];\nconst paymentStatusText = (status?: RentalRequest['paymentStatus']) => ({ unpaid:'Ожидает оплаты', pending:'Платёж создан', partially_paid:'Предоплата внесена', paid:'Оплачено' } as const)[status ?? 'unpaid'];",
  'payment status label');
app=replaceRequired(app,
  "function BookingModal({ vehicle, onClose, onSubmit }: { vehicle: FleetVehicle; onClose: () => void; onSubmit: (request: RentalRequest) => void }) {\n  function submit(event: FormEvent<HTMLFormElement>) {",
  "function BookingModal({ vehicle, onClose, onSubmit }: { vehicle: FleetVehicle; onClose: () => void; onSubmit: (request: RentalRequest) => Promise<void> | void }) {\n  const [busy, setBusy] = useState(false);\n  async function submit(event: FormEvent<HTMLFormElement>) {",
  'booking async signature');
app=replaceRequired(app,
  "    onSubmit({\n      id: crypto.randomUUID(),\n      vehicleId: vehicle.id,\n      from,\n      to,\n      client: String(data.get('client') ?? ''),\n      contact: String(data.get('contact') ?? ''),\n      status: 'new',\n      estimate: publishedEstimate(vehicle, from, to),\n      createdAt: new Date().toISOString(),\n    });",
  "    setBusy(true);\n    try {\n      await onSubmit({\n        id: crypto.randomUUID(),\n        vehicleId: vehicle.id,\n        from,\n        to,\n        client: String(data.get('client') ?? ''),\n        contact: String(data.get('contact') ?? ''),\n        status: 'new',\n        estimate: publishedEstimate(vehicle, from, to),\n        createdAt: new Date().toISOString(),\n        paymentStatus: 'unpaid',\n      });\n    } finally { setBusy(false); }",
  'booking async submit');
app=replaceRequired(app,
  '<button className="primary wide" type="submit">Отправить заявку</button>',
  '<button className="primary wide" type="submit" disabled={busy}>{busy ? \'Создаём бронь…\' : \'Перейти к оплате\'}</button>',
  'booking submit button');
app=replaceRequired(app,
  "  const [extendingRequestId, setExtendingRequestId] = useState<string | null>(null);\n  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);",
  "  const [extendingRequestId, setExtendingRequestId] = useState<string | null>(null);\n  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);\n  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);",
  'payment request state');
app=replaceRequired(app,
  "  const extendingRequest = extendingRequestId ? requests.find((item) => item.id === extendingRequestId) : undefined;\n  const extendingVehicle = extendingRequest ? fleet.find((item) => item.id === extendingRequest.vehicleId) : undefined;",
  "  const extendingRequest = extendingRequestId ? requests.find((item) => item.id === extendingRequestId) : undefined;\n  const extendingVehicle = extendingRequest ? fleet.find((item) => item.id === extendingRequest.vehicleId) : undefined;\n  const paymentRequest = paymentRequestId ? requests.find((item) => item.id === paymentRequestId) : undefined;\n  const paymentVehicle = paymentRequest ? fleet.find((item) => item.id === paymentRequest.vehicleId) : undefined;",
  'payment request derived');
app=replaceRequired(app,
  "  function requestCard(request: RentalRequest) {",
  "  async function submitClientBooking(request: RentalRequest) {\n    let next: RentalRequest = { ...request, paymentStatus: 'unpaid' };\n    try {\n      const persisted = await createPersistedBooking({ vehicleId: request.vehicleId, from: request.from, to: request.to, client: request.client, contact: request.contact });\n      next = { ...next, backendBookingId: persisted.bookingId, estimate: persisted.estimatedTotalVnd || request.estimate };\n    } catch {}\n    setRequests((current) => [...current, next]);\n    setBookingVehicleId(null);\n    setSelectedId(null);\n    if (next.backendBookingId) setPaymentRequestId(next.id);\n    else { setRoute('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }\n  }\n\n  function requestCard(request: RentalRequest) {",
  'persisted booking submit');
app=replaceRequired(app,
  "      <b>{money(request.estimate)}</b>\n      {role === 'employee' ?",
  "      <b>{money(request.estimate)}</b>\n      <div className={`request-payment ${request.paymentStatus ?? 'unpaid'}`}><span>Оплата</span><b>{paymentStatusText(request.paymentStatus)}</b>{request.paymentProvider ? <small>{request.paymentProvider}</small> : null}</div>\n      {role === 'client' && request.backendBookingId && request.paymentStatus !== 'paid' ? <button className=\"secondary\" data-pay-booking={request.id} onClick={() => setPaymentRequestId(request.id)}>Оплатить</button> : null}\n      {role === 'employee' ?",
  'request payment UI');
app=replaceRequired(app,
  "    {bookingVehicle ? <BookingModal vehicle={bookingVehicle} onClose={() => setBookingVehicleId(null)} onSubmit={(request) => { setRequests((current) => [...current, request]); setBookingVehicleId(null); setSelectedId(null); setRoute('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>: null}\n    {extendingRequest && extendingVehicle ?",
  "    {bookingVehicle ? <BookingModal vehicle={bookingVehicle} onClose={() => setBookingVehicleId(null)} onSubmit={submitClientBooking}/>: null}\n    {paymentRequest && paymentVehicle && paymentRequest.backendBookingId ? <PaymentCheckout bookingId={paymentRequest.backendBookingId} vehicleTitle={paymentVehicle.title} totalVnd={paymentRequest.estimate} onClose={() => { setPaymentRequestId(null); setRoute('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onPaid={(result) => { setRequests((current) => current.map((item) => item.id === paymentRequest.id ? { ...item, paymentStatus: result.bookingPaymentStatus === 'paid' ? 'paid' : 'partially_paid', paymentId: result.paymentId, paymentProvider: result.provider } : item)); }}/>: null}\n    {extendingRequest && extendingVehicle ?",
  'payment checkout render');
fs.writeFileSync(appPath,app);

const mainPath='src/main.tsx';
let main=fs.readFileSync(mainPath,'utf8');
main=replaceRequired(main,
  "import './features/bookings/owner-calendar.css';",
  "import './features/bookings/owner-calendar.css';\nimport './features/payments/payment-checkout.css';",
  'payment css import');
fs.writeFileSync(mainPath,main);

const workerPath='src/worker.ts';
let worker=fs.readFileSync(workerPath,'utf8');
worker=replaceRequired(worker,
  "import { handleBookingOperationsRequest } from './api/bookingOperationsWorker.js';",
  "import { handleBookingOperationsRequest } from './api/bookingOperationsWorker.js';\nimport { handlePaymentRequest } from './api/paymentWorker.js';",
  'payment worker import');
worker=replaceRequired(worker,
  "schemaVersion: env.DB ? 5 : null, verifiedCatalog: vehicles.length, ownerFleetManagement: true, bookingCalendar: true, rentalLifecycle: true",
  "schemaVersion: env.DB ? 6 : null, verifiedCatalog: vehicles.length, ownerFleetManagement: true, bookingCalendar: true, rentalLifecycle: true, paymentCheckout: true, paymentProviders: 7",
  'health payment version');
worker=replaceRequired(worker,
  "    const bookingOperationsResponse = await handleBookingOperationsRequest(request, env, url);\n    if (bookingOperationsResponse) return bookingOperationsResponse;",
  "    const bookingOperationsResponse = await handleBookingOperationsRequest(request, env, url);\n    if (bookingOperationsResponse) return bookingOperationsResponse;\n    const paymentResponse = await handlePaymentRequest(request, env, url);\n    if (paymentResponse) return paymentResponse;",
  'payment routing');
fs.writeFileSync(workerPath,worker);

const testPath='tests/domain.test.mjs';
let tests=fs.readFileSync(testPath,'utf8');
if(!tests.includes('stage 5 payment checkout contracts are present')) tests += `\n\ntest('stage 5 payment checkout contracts are present',async()=>{\n  const migration=await readFile(new URL('../migrations/0006_payment_checkout.sql',import.meta.url),'utf8');\n  const worker=await readFile(new URL('../src/api/paymentWorker.ts',import.meta.url),'utf8');\n  const ui=await readFile(new URL('../src/features/payments/PaymentCheckout.tsx',import.meta.url),'utf8');\n  for(const provider of ['vietqr','vnpay','momo','zalopay','sbp','yookassa','tbank']) assert.ok(worker.includes(provider));\n  assert.ok(migration.includes('payment_events'));\n  assert.ok(worker.includes('/api/payments/intents'));\n  assert.ok(worker.includes('demo-confirm'));\n  assert.ok(ui.includes('data-payment-provider'));\n  assert.ok(ui.includes('data-payment-percent'));\n});\n`;
fs.writeFileSync(testPath,tests);

const e2ePath='tests/e2e.py';
let e2e=fs.readFileSync(e2ePath,'utf8');
const marker='        ctx.close(); browser.close()\n';
if(!e2e.includes('stage5-payment-checkout')) {
  if(!e2e.includes(marker)) throw new Error('Missing e2e tail marker');
  const block=`        ctx.close()\n\n        # Stage 5: persisted booking -> provider -> QR -> demo payment confirmation.\n        def payment_api(route):\n            request=route.request\n            path=urlparse(request.url).path\n            method=request.method\n            if path=='/api/fleet-overrides' and method=='GET':\n                route.fulfill(status=200,content_type='application/json',body='{\"vehicles\":[],\"persisted\":false}')\n                return\n            if path=='/api/bookings' and method=='POST':\n                route.fulfill(status=201,content_type='application/json',body=json.dumps({'bookingId':'booking-stage5','estimatedTotalVnd':9000000,'status':'new','persisted':True}))\n                return\n            if path=='/api/payments/providers' and method=='GET':\n                providers=[{'id':p,'label':l,'market':m,'currency':'VND' if m=='Vietnam' else 'RUB','credentialReady':False,'checkoutMode':'demo'} for p,l,m in [('vietqr','VietQR','Vietnam'),('vnpay','VNPAY','Vietnam'),('momo','MoMo','Vietnam'),('zalopay','ZaloPay','Vietnam'),('sbp','СБП','Russia'),('yookassa','ЮKassa','Russia'),('tbank','T‑Bank','Russia')]]\n                route.fulfill(status=200,content_type='application/json',body=json.dumps({'providers':providers}))\n                return\n            if path=='/api/payments/intents' and method=='POST':\n                payload=json.loads(request.post_data or '{}')\n                route.fulfill(status=201,content_type='application/json',body=json.dumps({'payment':{'id':'pay-stage5','bookingId':'booking-stage5','provider':payload.get('provider','vietqr'),'providerLabel':'MoMo' if payload.get('provider')=='momo' else 'VietQR','status':'pending','amountVnd':9000000,'totalVnd':9000000,'alreadyPaidVnd':0,'requestedPercent':payload.get('prepaymentPercent',100),'paymentReference':'UNIQ-STAGE5','paymentUrl':'https://uniq-smart-rent.viiversion.com/?payment=stage5','qrPayload':'https://uniq-smart-rent.viiversion.com/?payment=stage5','expiresAt':'2026-09-09T01:00:00.000Z','mode':'demo'},'persisted':True}))\n                return\n            if path=='/api/payments/pay-stage5/demo-confirm' and method=='POST':\n                route.fulfill(status=200,content_type='application/json',body=json.dumps({'paymentId':'pay-stage5','status':'paid','bookingPaidVnd':9000000,'bookingPaymentStatus':'paid','persisted':True}))\n                return\n            route.fulfill(status=404,content_type='application/json',body='{\"error\":\"not_found\"}')\n\n        ctx=browser.new_context(viewport={\"width\":390,\"height\":844},locale='ru-RU')\n        page=ctx.new_page(); errors=[]\n        page.route('**/api/**',payment_api)\n        page.on('console',lambda msg: capture_console_error(errors,msg))\n        page.goto('http://127.0.0.1:8764/',wait_until='networkidle')\n        page.locator('[data-go=\"catalog\"]').last.click(); page.wait_for_timeout(60)\n        page.locator('.vehicle-card').first.locator('[data-book]').click(); page.wait_for_timeout(40)\n        form=page.locator('#bookForm'); form.locator('input[name=\"client\"]').fill('Payment QA'); form.locator('input[name=\"contact\"]').fill('@paymentqa')\n        form.locator('button[type=\"submit\"]').click(); page.wait_for_timeout(120)\n        assert page.locator('[data-payment-checkout]').count()==1\n        assert page.locator('[data-payment-provider]').count()==7\n        page.locator('[data-payment-percent=\"100\"]').click(); page.locator('[data-payment-provider=\"momo\"]').click(); page.locator('[data-create-payment]').click(); page.wait_for_timeout(180)\n        assert page.locator('[data-payment-ready]').count()==1\n        qr=page.locator('.payment-qr img'); assert qr.count()==1\n        page.wait_for_function('(node)=>node.complete && node.naturalWidth>0',arg=qr.element_handle(),timeout=5000)\n        page.locator('[data-demo-confirm-payment]').click(); page.wait_for_timeout(100)\n        assert page.locator('[data-payment-success]').count()==1\n        page.locator('.payment-checkout .modal-x').click(); page.wait_for_timeout(80)\n        assert page.get_by_text('Оплачено',exact=True).count()>=1\n        assert not errors,errors\n        results.append({\"scenario\":\"stage5-payment-checkout\",\"providers\":7,\"booking_persisted\":\"ok\",\"qr\":\"ok\",\"demo_confirm\":\"ok\",\"payment_status\":\"paid\",\"console_errors\":errors})\n        ctx.close(); browser.close()\n`;
  e2e=e2e.replace(marker,block);
}
fs.writeFileSync(e2ePath,e2e);

console.log('Stage 5 payment checkout patches applied');
