import fs from 'node:fs';

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

const appPath = 'src/features/prototype/PrototypeApp.tsx';
let app = fs.readFileSync(appPath, 'utf8');
app = replaceRequired(app,
  "import { FormEvent, useEffect, useMemo, useState } from 'react';\n",
  "import { FormEvent, useEffect, useMemo, useState } from 'react';\nimport { OwnerFleetManager } from '../fleet/OwnerFleetManager';\nimport { fetchFleetOverrides } from '../../api/ownerFleet';\nimport { activeOperationalFleet, FleetState, ManagedFleetVehicle as FleetVehicle, mergeFleetOverrides, normalizeBaseVehicle, publicFleet as selectPublicFleet, VehicleType } from '../fleet/fleetManagement';\n",
  'prototype imports');
app = replaceRequired(app, "type VehicleType = 'car' | 'scooter' | 'motorcycle';\ntype FleetState = 'manager' | 'ready' | 'service' | 'hold';\n", '', 'legacy fleet types');
app = app.replace(/interface FleetVehicle \{[\s\S]*?\n\}\n\ninterface RentalRequest/, 'interface RentalRequest');

app = replaceRequired(app,
  "  const fleet = useMemo(() => Array.isArray(window.UNIQ_FLEET) ? window.UNIQ_FLEET : [], []);",
  "  const baseFleet = useMemo<FleetVehicle[]>(() => (Array.isArray(window.UNIQ_FLEET) ? window.UNIQ_FLEET : []).map(normalizeBaseVehicle), []);\n  const [fleet, setFleet] = useState<FleetVehicle[]>(baseFleet);",
  'fleet state');

app = replaceRequired(app,
  "  useEffect(() => { window.Telegram?.WebApp?.ready?.(); window.Telegram?.WebApp?.expand?.(); }, []);\n  useEffect(() => { persistSession(requestKey, requests); }, [requests]);",
  "  useEffect(() => { window.Telegram?.WebApp?.ready?.(); window.Telegram?.WebApp?.expand?.(); }, []);\n  useEffect(() => {\n    let active = true;\n    fetchFleetOverrides().then((overrides) => { if (active) setFleet(mergeFleetOverrides(baseFleet, overrides)); });\n    return () => { active = false; };\n  }, [baseFleet]);\n  useEffect(() => { persistSession(requestKey, requests); }, [requests]);",
  'fleet override hydration');

app = replaceRequired(app,
  "  const effectiveFleetState = (id: string): FleetState => fleetStates[id] ?? 'manager';",
  "  const effectiveFleetState = (id: string): FleetState => fleetStates[id] ?? fleet.find((vehicle) => vehicle.id === id)?.status ?? 'manager';",
  'persisted fleet state');

app = replaceRequired(app,
  "  const filteredFleet = fleet.filter((vehicle) => {\n    const q = query.toLowerCase().trim();\n    return (type === 'all' || vehicle.type === type) && (!q || `${vehicle.title} ${vehicle.engine ?? ''} ${vehicle.year ?? ''}`.toLowerCase().includes(q));\n  });",
  "  const clientFleet = selectPublicFleet(fleet);\n  const operationalFleet = activeOperationalFleet(fleet);\n  const filteredFleet = clientFleet.filter((vehicle) => {\n    const q = query.toLowerCase().trim();\n    return (type === 'all' || vehicle.type === type) && (!q || `${vehicle.title} ${vehicle.engine ?? ''} ${vehicle.year ?? ''}`.toLowerCase().includes(q));\n  });",
  'public fleet filtering');

app = replaceRequired(app,
  "    const featured = fleet.filter((vehicle) => (vehicle.photos?.length ?? 0) > 0).slice(0, 6);",
  "    const featured = clientFleet.filter((vehicle) => (vehicle.photos?.length ?? 0) > 0).slice(0, 6);",
  'home featured');
app = replaceRequired(app, '<div className="hero-card"><b>{fleet.length}</b><span>единиц техники</span>', '<div className="hero-card"><b>{clientFleet.length}</b><span>единиц техники</span>', 'home public count');
app = replaceRequired(app, '<span>{filteredFleet.length} из {fleet.length}</span>', '<span>{filteredFleet.length} из {clientFleet.length}</span>', 'catalog count');
app = replaceRequired(app, '<Metric label="Парк" value={fleet.length}/><Metric label="Готовы к выдаче" value={ready}/>', '<Metric label="Парк" value={operationalFleet.length}/><Metric label="Готовы к выдаче" value={ready}/>', 'employee dashboard count');
app = replaceRequired(app, '<section className="fleet-table">{fleet.map((vehicle) =>', '<section className="fleet-table">{operationalFleet.map((vehicle) =>', 'employee active fleet');

const ownerFleetRegex = /  function ownerFleet\(\) \{[\s\S]*?\n  \}\n\n  let content: React\.ReactNode;/;
if (!ownerFleetRegex.test(app)) throw new Error('Missing ownerFleet block');
app = app.replace(ownerFleetRegex, `  function ownerFleet() {\n    return <OwnerFleetManager fleet={fleet} baseFleet={baseFleet} fleetStates={fleetStates} setFleet={setFleet} setFleetStates={setFleetStates}/>;\n  }\n\n  let content: React.ReactNode;`);
fs.writeFileSync(appPath, app);

const workerPath = 'src/worker.ts';
let worker = fs.readFileSync(workerPath, 'utf8');
worker = replaceRequired(worker,
  "import type { D1DatabaseLike } from './db/bootstrap.js';\n",
  "import type { D1DatabaseLike } from './db/bootstrap.js';\nimport { handleFleetManagementRequest } from './api/ownerFleetWorker.js';\n",
  'worker import');
worker = replaceRequired(worker,
  "  STAFF_API_KEY?: string;\n}",
  "  STAFF_API_KEY?: string;\n  DEMO_MODE?: string;\n}",
  'worker demo env');
worker = replaceRequired(worker,
  "const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,x-uniq-admin-key', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS' };",
  "const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,x-uniq-admin-key,x-uniq-demo-role', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };",
  'worker cors');
worker = replaceRequired(worker,
  "    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), d1Ready: Boolean(env.DB), schemaVersion: env.DB ? 2 : null, verifiedCatalog: vehicles.length }, 200, corsHeaders);",
  "    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), d1Ready: Boolean(env.DB), schemaVersion: env.DB ? 4 : null, verifiedCatalog: vehicles.length, ownerFleetManagement: true }, 200, corsHeaders);",
  'health schema');
worker = replaceRequired(worker,
  "    if (url.pathname === '/api/bookings' && request.method === 'POST') return createBooking(request, env);\n    const statusMatch",
  "    if (url.pathname === '/api/bookings' && request.method === 'POST') return createBooking(request, env);\n    const fleetManagementResponse = await handleFleetManagementRequest(request, env, url);\n    if (fleetManagementResponse) return fleetManagementResponse;\n    const statusMatch",
  'fleet management routing');
fs.writeFileSync(workerPath, worker);

const testPath = 'tests/domain.test.mjs';
let tests = fs.readFileSync(testPath, 'utf8');
if (!tests.includes('stage 3 owner fleet management contracts are present')) {
  tests += `\n\ntest('stage 3 owner fleet management contracts are present',()=>{\n  const migration=readFileSync(new URL('../migrations/0004_owner_fleet_management.sql',import.meta.url),'utf8');\n  const worker=readFileSync(new URL('../src/api/ownerFleetWorker.ts',import.meta.url),'utf8');\n  const ui=readFileSync(new URL('../src/features/fleet/OwnerFleetManager.tsx',import.meta.url),'utf8');\n  assert.match(migration,/owner_managed/);\n  assert.match(worker,/\/api\/fleet-overrides/);\n  assert.match(worker,/owner_saved/);\n  assert.match(ui,/Добавить технику/);\n  assert.match(ui,/data-owner-save/);\n});\n`;
}
fs.writeFileSync(testPath, tests);

console.log('Stage 3 owner fleet patches applied');
// trigger: 2026-09-08T21:21+07:00
