import fs from 'node:fs';

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

// 1) Owner fleet: add explicit vehicle-type filter.
const ownerPath = 'src/features/fleet/OwnerFleetManager.tsx';
let owner = fs.readFileSync(ownerPath, 'utf8');
owner = replaceRequired(owner,
  "  const [statusFilter, setStatusFilter] = useState<'all' | FleetState | 'archived'>('all');\n  const [branchFilter, setBranchFilter] = useState<'all' | 'branch-north' | 'branch-center'>('all');",
  "  const [statusFilter, setStatusFilter] = useState<'all' | FleetState | 'archived'>('all');\n  const [typeFilter, setTypeFilter] = useState<'all' | VehicleType>('all');\n  const [branchFilter, setBranchFilter] = useState<'all' | 'branch-north' | 'branch-center'>('all');",
  'owner type filter state');
owner = replaceRequired(owner,
  "    if (statusFilter !== 'all' && statusFilter !== 'archived' && state !== statusFilter) return false;\n    if (branchFilter !== 'all' && vehicle.branchId !== branchFilter) return false;",
  "    if (statusFilter !== 'all' && statusFilter !== 'archived' && state !== statusFilter) return false;\n    if (typeFilter !== 'all' && vehicle.type !== typeFilter) return false;\n    if (branchFilter !== 'all' && vehicle.branchId !== branchFilter) return false;",
  'owner type filter predicate');
owner = replaceRequired(owner,
  "  }), [fleet, search, statusFilter, branchFilter, fleetStates]);",
  "  }), [fleet, search, statusFilter, typeFilter, branchFilter, fleetStates]);",
  'owner type filter deps');
owner = replaceRequired(owner,
  "      <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value as typeof branchFilter)}>",
  "      <select data-owner-fleet-type-filter value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>\n        <option value=\"all\">Все типы</option><option value=\"car\">Авто</option><option value=\"motorcycle\">Мотоциклы</option><option value=\"scooter\">Скутеры</option>\n      </select>\n      <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value as typeof branchFilter)}>",
  'owner type filter UI');
fs.writeFileSync(ownerPath, owner);

// 2) React app: calendar route + local demo lifecycle/extension.
const appPath = 'src/features/prototype/PrototypeApp.tsx';
let app = fs.readFileSync(appPath, 'utf8');
app = replaceRequired(app,
  "import { OwnerFleetManager } from '../fleet/OwnerFleetManager';\n",
  "import { OwnerFleetManager } from '../fleet/OwnerFleetManager';\nimport { OwnerBookingCalendar } from '../bookings/OwnerBookingCalendar';\n",
  'calendar import');
app = replaceRequired(app,
  "type OwnerRoute = 'overview' | 'requests' | 'fleet';",
  "type OwnerRoute = 'overview' | 'requests' | 'fleet' | 'calendar';",
  'owner calendar route type');
app = replaceRequired(app,
  "  owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк']],",
  "  owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк'],['calendar','Календарь']],",
  'owner calendar nav');
app = replaceRequired(app,
  "const icon = (route: Route) => ({home:'⌂',catalog:'▦',requests:'◫',contacts:'◎',dashboard:'⌘',fleet:'◆',handover:'↔',overview:'◉'} as Partial<Record<Route,string>>)[route] ?? '•';",
  "const icon = (route: Route) => ({home:'⌂',catalog:'▦',requests:'◫',contacts:'◎',dashboard:'⌘',fleet:'◆',handover:'↔',overview:'◉',calendar:'▥'} as Partial<Record<Route,string>>)[route] ?? '•';",
  'calendar icon');

const extensionComponent = `function ExtensionModal({ request, vehicle, onClose, onSubmit }: { request: RentalRequest; vehicle: FleetVehicle; onClose: () => void; onSubmit: (newTo: string, additional: number) => void }) {\n  const nextDay = new Date(\`\${request.to}T00:00:00Z\`); nextDay.setUTCDate(nextDay.getUTCDate() + 1);\n  const minDate = dateISO(nextDay);\n  const [newTo, setNewTo] = useState(minDate);\n  const additional = newTo >= minDate ? publishedEstimate(vehicle, minDate, newTo) : 0;\n  return <div className=\"modal-bg\" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>\n    <section className=\"modal\" data-extension-modal><button className=\"modal-x\" onClick={onClose}>×</button><span className=\"eyebrow\">ПРОДЛЕНИЕ АРЕНДЫ</span><h2>{vehicle.title}</h2><p>Текущий возврат: <b>{request.to}</b></p>\n      <label>Новая дата возврата<input data-extension-to type=\"date\" min={minDate} value={newTo} onChange={(event) => setNewTo(event.target.value)} /></label>\n      <div className=\"extension-summary\"><b>Доплата: {money(additional)}</b><span>Расчёт по опубликованным тарифам. Финальная сумма подтверждается системой оплаты.</span></div>\n      <button className=\"primary wide\" data-extension-submit disabled={!newTo || newTo < minDate} onClick={() => onSubmit(newTo, additional)}>Продлить аренду</button>\n    </section>\n  </div>;\n}\n\n`;
if (!app.includes('function ExtensionModal(')) app = replaceRequired(app, 'function ScrollTop() {', extensionComponent + 'function ScrollTop() {', 'extension modal');
app = replaceRequired(app,
  "  const [bookingVehicleId, setBookingVehicleId] = useState<string | null>(null);\n  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);",
  "  const [bookingVehicleId, setBookingVehicleId] = useState<string | null>(null);\n  const [extendingRequestId, setExtendingRequestId] = useState<string | null>(null);\n  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);",
  'extension state');
app = replaceRequired(app,
  "  const selectedVehicle = selectedId ? fleet.find((item) => item.id === selectedId) : undefined;\n  const bookingVehicle = bookingVehicleId ? fleet.find((item) => item.id === bookingVehicleId) : undefined;\n\n  function requestCard(request: RentalRequest) {",
  "  const selectedVehicle = selectedId ? fleet.find((item) => item.id === selectedId) : undefined;\n  const bookingVehicle = bookingVehicleId ? fleet.find((item) => item.id === bookingVehicleId) : undefined;\n  const extendingRequest = extendingRequestId ? requests.find((item) => item.id === extendingRequestId) : undefined;\n  const extendingVehicle = extendingRequest ? fleet.find((item) => item.id === extendingRequest.vehicleId) : undefined;\n\n  function setLifecycleStatus(request: RentalRequest, status: RequestStatus) {\n    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));\n    if (status === 'active') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'hold' }));\n    if (status === 'returned' || status === 'completed') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'ready' }));\n  }\n\n  function requestCard(request: RentalRequest) {",
  'lifecycle helpers');
const oldRequestActions = `      {role === 'employee' ? <select data-status={request.id} value={request.status} onChange={(event) => setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: event.target.value as RequestStatus } : item))}>\n        {(['new','contacted','confirmed','issued','active','returned','completed','cancelled'] as RequestStatus[]).map((status) => <option key={status} value={status}>{statusText(status)}</option>)}\n      </select> : null}`;
const newRequestActions = `      {role === 'employee' ? <select data-status={request.id} value={request.status} onChange={(event) => setLifecycleStatus(request, event.target.value as RequestStatus)}>\n        {(['new','contacted','confirmed','issued','active','returned','completed','cancelled'] as RequestStatus[]).map((status) => <option key={status} value={status}>{statusText(status)}</option>)}\n      </select> : null}\n      {role !== 'client' ? <div className=\"request-actions\">\n        {request.status === 'confirmed' ? <button className=\"primary\" data-issue={request.id} onClick={() => setLifecycleStatus(request,'active')}>Выдать технику</button> : null}\n        {request.status === 'issued' ? <button className=\"primary\" onClick={() => setLifecycleStatus(request,'active')}>Начать аренду</button> : null}\n        {request.status === 'active' || request.status === 'issued' ? <button className=\"secondary\" data-extend={request.id} onClick={() => setExtendingRequestId(request.id)}>Продлить</button> : null}\n        {request.status === 'active' || request.status === 'issued' ? <button className=\"secondary\" data-return={request.id} onClick={() => setLifecycleStatus(request,'returned')}>Принять возврат</button> : null}\n        {request.status === 'returned' ? <button className=\"primary\" data-complete={request.id} onClick={() => setLifecycleStatus(request,'completed')}>Завершить аренду</button> : null}\n      </div> : null}`;
app = replaceRequired(app, oldRequestActions, newRequestActions, 'request lifecycle actions');
app = replaceRequired(app,
  "  function ownerFleet() {\n    return <OwnerFleetManager fleet={fleet} baseFleet={baseFleet} fleetStates={fleetStates} setFleet={setFleet} setFleetStates={setFleetStates}/>;\n  }\n\n  let content: React.ReactNode;",
  "  function ownerFleet() {\n    return <OwnerFleetManager fleet={fleet} baseFleet={baseFleet} fleetStates={fleetStates} setFleet={setFleet} setFleetStates={setFleetStates}/>;\n  }\n\n  function ownerCalendar() {\n    return <OwnerBookingCalendar fleet={fleet} requests={requests} fleetStates={fleetStates}/>;\n  }\n\n  let content: React.ReactNode;",
  'owner calendar function');
app = replaceRequired(app,
  "  else content = route === 'requests' ? requestsPage() : route === 'fleet' ? ownerFleet() : ownerOverview();",
  "  else content = route === 'requests' ? requestsPage() : route === 'fleet' ? ownerFleet() : route === 'calendar' ? ownerCalendar() : ownerOverview();",
  'owner calendar render');
app = replaceRequired(app,
  "    {bookingVehicle ? <BookingModal vehicle={bookingVehicle} onClose={() => setBookingVehicleId(null)} onSubmit={(request) => { setRequests((current) => [...current, request]); setBookingVehicleId(null); setSelectedId(null); setRoute('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>: null}\n    <ScrollTop/>",
  "    {bookingVehicle ? <BookingModal vehicle={bookingVehicle} onClose={() => setBookingVehicleId(null)} onSubmit={(request) => { setRequests((current) => [...current, request]); setBookingVehicleId(null); setSelectedId(null); setRoute('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}/>: null}\n    {extendingRequest && extendingVehicle ? <ExtensionModal request={extendingRequest} vehicle={extendingVehicle} onClose={() => setExtendingRequestId(null)} onSubmit={(newTo, additional) => { setRequests((current) => current.map((item) => item.id === extendingRequest.id ? { ...item, to: newTo, estimate: item.estimate + additional } : item)); setExtendingRequestId(null); }}/>: null}\n    <ScrollTop/>",
  'extension render');
fs.writeFileSync(appPath, app);

// 3) Main stylesheet import.
const mainPath = 'src/main.tsx';
let main = fs.readFileSync(mainPath, 'utf8');
if (!main.includes("./features/bookings/owner-calendar.css")) main = replaceRequired(main,
  "import './features/fleet/owner-fleet.css';\n",
  "import './features/fleet/owner-fleet.css';\nimport './features/bookings/owner-calendar.css';\n",
  'calendar stylesheet');
fs.writeFileSync(mainPath, main);

// 4) Worker: D1-aware bookings + Stage 4 APIs.
const workerPath = 'src/worker.ts';
let worker = fs.readFileSync(workerPath, 'utf8');
worker = replaceRequired(worker,
  "import { handleFleetManagementRequest } from './api/ownerFleetWorker.js';\n",
  "import { handleFleetManagementRequest } from './api/ownerFleetWorker.js';\nimport { handleBookingOperationsRequest } from './api/bookingOperationsWorker.js';\n",
  'booking operations import');
worker = replaceRequired(worker,
  "function isAdmin(request: Request, env: Env): boolean {\n  if (!env.STAFF_API_KEY) return false;\n  return request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY;\n}",
  "function isAdmin(request: Request, env: Env): boolean {\n  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;\n  const role = request.headers.get('x-uniq-demo-role');\n  return env.DEMO_MODE === 'true' && (role === 'owner' || role === 'employee');\n}",
  'demo staff authorization');
worker = replaceRequired(worker,
  "  const service = await db.prepare(`SELECT id FROM service_events WHERE vehicle_id = ? AND date(starts_at) <= date(?) AND date(COALESCE(ends_at, starts_at)) >= date(?) LIMIT 1`)\n    .bind(vehicleId, to, from).first<{ id: string }>();\n  return service ? { type: 'service', id: service.id } : null;",
  "  const block = await db.prepare(`SELECT id, block_type FROM vehicle_availability_blocks WHERE vehicle_id = ? AND date(starts_at) <= date(?) AND date(ends_at) >= date(?) LIMIT 1`)\n    .bind(vehicleId, to, from).first<{ id: string; block_type: string }>();\n  if (block) return { type: 'service', id: block.id, status: block.block_type };\n  const service = await db.prepare(`SELECT id FROM service_events WHERE vehicle_id = ? AND date(starts_at) <= date(?) AND date(COALESCE(ends_at, starts_at)) >= date(?) LIMIT 1`)\n    .bind(vehicleId, to, from).first<{ id: string }>();\n  return service ? { type: 'service', id: service.id } : null;",
  'availability block conflict');
const rateHelpers = `\nasync function d1VehicleRates(db: D1DatabaseLike, vehicleId: string): Promise<{ daily: number; weekly: number; monthly: number } | null> {\n  const row = await db.prepare(\`SELECT v.id, v.archived_at, v.published, COALESCE(p.daily_vnd,0) AS daily_vnd, COALESCE(p.weekly_vnd,0) AS weekly_vnd, COALESCE(p.monthly_vnd,0) AS monthly_vnd FROM vehicles v LEFT JOIN pricing p ON p.vehicle_id=v.id WHERE v.id=? LIMIT 1\`)\n    .bind(vehicleId).first<{ id: string; archived_at: string | null; published: number; daily_vnd: number; weekly_vnd: number; monthly_vnd: number }>();\n  if (!row || row.archived_at || Number(row.published ?? 1) === 0) return null;\n  return { daily: Number(row.daily_vnd ?? 0), weekly: Number(row.weekly_vnd ?? 0), monthly: Number(row.monthly_vnd ?? 0) };\n}\n\nfunction calculateD1Total(rates: { daily: number; weekly: number; monthly: number }, from: string, to: string): number {\n  const start = new Date(\`\${from}T00:00:00Z\`).getTime();\n  const end = new Date(\`\${to}T00:00:00Z\`).getTime();\n  let days = Math.max(1, Math.ceil((end - start) / 86_400_000));\n  let total = 0;\n  if (rates.monthly > 0) { const count = Math.floor(days / 30); total += count * rates.monthly; days -= count * 30; }\n  if (rates.weekly > 0) { const count = Math.floor(days / 7); total += count * rates.weekly; days -= count * 7; }\n  total += days * rates.daily;\n  return total;\n}\n`;
if (!worker.includes('async function d1VehicleRates')) worker = replaceRequired(worker, "function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }\n", "function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }\n" + rateHelpers, 'D1 rate helpers');

const createRegex = /async function createBooking\(request: Request, env: Env\): Promise<Response> \{[\s\S]*?\n\}\n\nasync function availability/;
if (!createRegex.test(worker)) throw new Error('Missing createBooking block');
worker = worker.replace(createRegex, `async function createBooking(request: Request, env: Env): Promise<Response> {\n  const body = await parseBody(request);\n  if (!body) return json({ error: 'invalid_json' }, 400, corsHeaders);\n  const vehicleId = text(body.vehicleId), from = text(body.from), to = text(body.to), client = text(body.client), contact = text(body.contact);\n  const channel = text(body.channel) || 'other';\n  const deliveryLocation = text(body.deliveryLocation), note = text(body.note);\n  if (!client || !contact || !isValidDateRange(from, to)) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);\n  if (!env.DB) return json({ error: 'persistence_not_configured', fallback: 'manager_contact', persisted: false }, 503, corsHeaders);\n  const staticVehicle = getVehicle(vehicleId);\n  const rates = staticVehicle ? null : await d1VehicleRates(env.DB, vehicleId);\n  if (!staticVehicle && !rates) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);\n  const conflict = await bookingConflict(env.DB, vehicleId, from, to);\n  if (conflict) return json({ error: 'vehicle_window_conflict', persisted: false, conflict }, 409, corsHeaders);\n  const estimatedTotal = staticVehicle ? calculateRentalTotal(staticVehicle, from, to) : calculateD1Total(rates!, from, to);\n  const customerId = crypto.randomUUID();\n  const bookingId = crypto.randomUUID();\n  const now = new Date().toISOString();\n  await env.DB.prepare('INSERT INTO customers (id, name, contact, preferred_channel, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')\n    .bind(customerId, client, contact, channel, now, now).run();\n  await env.DB.prepare(\`INSERT INTO bookings (id, vehicle_id, customer_id, from_at, to_at, status, estimated_total_vnd, delivery_location, note, source, subtotal_vnd, total_vnd, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, 'smart-rent', ?, ?, ?, ?)\`)\n    .bind(bookingId, vehicleId, customerId, from, to, estimatedTotal, deliveryLocation, note, estimatedTotal, estimatedTotal, now, now).run();\n  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')\n    .bind(crypto.randomUUID(), 'booking', bookingId, 'created', JSON.stringify({ source: 'smart-rent' }), now).run();\n  return json({ bookingId, persisted: true, status: 'new', estimatedTotalVnd: estimatedTotal }, 201, corsHeaders);\n}\n\nasync function availability`);
const availabilityRegex = /async function availability\(request: Request, env: Env\): Promise<Response> \{[\s\S]*?\n\}\n\nasync function listBookings/;
if (!availabilityRegex.test(worker)) throw new Error('Missing availability block');
worker = worker.replace(availabilityRegex, `async function availability(request: Request, env: Env): Promise<Response> {\n  const url = new URL(request.url);\n  const vehicleId = url.searchParams.get('vehicleId') ?? '';\n  const from = url.searchParams.get('from') ?? '';\n  const to = url.searchParams.get('to') ?? '';\n  if (!isValidDateRange(from, to)) return json({ error: 'invalid_query' }, 400, corsHeaders);\n  if (!env.DB) return json({ vehicleId, from, to, mode: 'manager_confirmation', liveData: false, requestAllowed: true }, 200, corsHeaders);\n  const validVehicle = Boolean(getVehicle(vehicleId)) || Boolean(await d1VehicleRates(env.DB, vehicleId));\n  if (!validVehicle) return json({ error: 'invalid_query' }, 400, corsHeaders);\n  const conflict = await bookingConflict(env.DB, vehicleId, from, to);\n  return json({ vehicleId, from, to, mode: 'd1', liveData: true, requestAllowed: !conflict, conflict }, 200, corsHeaders);\n}\n\nasync function listBookings`);
worker = replaceRequired(worker,
  "    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), d1Ready: Boolean(env.DB), schemaVersion: env.DB ? 4 : null, verifiedCatalog: vehicles.length, ownerFleetManagement: true }, 200, corsHeaders);",
  "    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), d1Ready: Boolean(env.DB), schemaVersion: env.DB ? 5 : null, verifiedCatalog: vehicles.length, ownerFleetManagement: true, bookingCalendar: true, rentalLifecycle: true }, 200, corsHeaders);",
  'Stage 4 health');
worker = replaceRequired(worker,
  "    const fleetManagementResponse = await handleFleetManagementRequest(request, env, url);\n    if (fleetManagementResponse) return fleetManagementResponse;\n    const statusMatch",
  "    const fleetManagementResponse = await handleFleetManagementRequest(request, env, url);\n    if (fleetManagementResponse) return fleetManagementResponse;\n    const bookingOperationsResponse = await handleBookingOperationsRequest(request, env, url);\n    if (bookingOperationsResponse) return bookingOperationsResponse;\n    const statusMatch",
  'Stage 4 routing');
fs.writeFileSync(workerPath, worker);

// 5) Domain contract tests.
const testsPath = 'tests/domain.test.mjs';
let tests = fs.readFileSync(testsPath, 'utf8');
if (!tests.includes('stage 4 booking calendar and lifecycle contracts are present')) tests += `\n\ntest('stage 4 booking calendar and lifecycle contracts are present',async()=>{\n  const migration=await readFile(new URL('../migrations/0005_booking_calendar.sql',import.meta.url),'utf8');\n  const worker=await readFile(new URL('../src/api/bookingOperationsWorker.ts',import.meta.url),'utf8');\n  const calendar=await readFile(new URL('../src/features/bookings/OwnerBookingCalendar.tsx',import.meta.url),'utf8');\n  const ownerFleet=await readFile(new URL('../src/features/fleet/OwnerFleetManager.tsx',import.meta.url),'utf8');\n  assert.ok(migration.includes('booking_extensions'));\n  assert.ok(migration.includes('issued_at'));\n  assert.ok(worker.includes('/api/owner/calendar'));\n  assert.ok(worker.includes('/extend'));\n  assert.ok(worker.includes('/lifecycle'));\n  assert.ok(calendar.includes('КАЛЕНДАРЬ ЗАНЯТОСТИ'));\n  assert.ok(ownerFleet.includes('data-owner-fleet-type-filter'));\n});\n`;
fs.writeFileSync(testsPath, tests);

// 6) Browser E2E additions: type filter + calendar + lifecycle extension.
const e2ePath = 'tests/e2e.py';
let e2e = fs.readFileSync(e2ePath, 'utf8');
e2e = replaceRequired(e2e,
  "        assert page.locator('[data-owner-add-vehicle]').count()==1\n        assert page.locator('[data-owner-vehicle]').count()==89\n",
  "        assert page.locator('[data-owner-add-vehicle]').count()==1\n        assert page.locator('[data-owner-vehicle]').count()==89\n        owner_type=page.locator('[data-owner-fleet-type-filter]'); assert owner_type.count()==1\n        owner_type.select_option('car'); page.wait_for_timeout(40); assert page.locator('[data-owner-vehicle]').count()==7\n        owner_type.select_option('motorcycle'); page.wait_for_timeout(40); assert page.locator('[data-owner-vehicle]').count()==33\n        owner_type.select_option('scooter'); page.wait_for_timeout(40); assert page.locator('[data-owner-vehicle]').count()==49\n        owner_type.select_option('all'); page.wait_for_timeout(40); assert page.locator('[data-owner-vehicle]').count()==89\n",
  'owner type-filter e2e');
e2e = replaceRequired(e2e,
  "        assert page.locator('text=Пульс бизнеса').count()>=1\n        assert page.locator('.topbar .header-language-switcher select').count()==1\n",
  "        assert page.locator('text=Пульс бизнеса').count()>=1\n        assert page.locator('.topbar .header-language-switcher select').count()==1\n        page.locator('[data-go=\"calendar\"]').last.click(); page.wait_for_timeout(80)\n        assert page.locator('[data-owner-calendar]').count()==1\n        assert page.locator('[data-owner-calendar-type]').count()==1\n",
  'owner calendar e2e');
fs.writeFileSync(e2ePath, e2e);

console.log('Stage 4 booking calendar integration applied');
