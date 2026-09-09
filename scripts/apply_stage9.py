from pathlib import Path

def patch(path,repls):
    p=Path(path);t=p.read_text(encoding='utf-8')
    for old,new in repls:
        if new in t: continue
        if old not in t: raise SystemExit(f'anchor missing {path}: {old[:100]}')
        t=t.replace(old,new,1)
    p.write_text(t,encoding='utf-8')

patch('src/features/prototype/PrototypeApp.tsx',[
 ("import { OwnerFinance } from '../finance/OwnerFinance';", "import { OwnerFinance } from '../finance/OwnerFinance';\nimport { OwnerService } from '../service/OwnerService';"),
 ("import { createPersistedBooking, PaymentProvider } from '../../api/payments';", "import { createPersistedBooking, PaymentProvider, updatePersistedBookingStatus } from '../../api/payments';"),
 ("type OwnerRoute = 'overview' | 'requests' | 'fleet' | 'calendar' | 'customers' | 'team' | 'finance';", "type OwnerRoute = 'overview' | 'requests' | 'fleet' | 'calendar' | 'customers' | 'team' | 'finance' | 'service';"),
 ("owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк'],['calendar','Календарь'],['customers','Клиенты'],['team','Команда'],['finance','Финансы']],", "owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк'],['calendar','Календарь'],['customers','Клиенты'],['team','Команда'],['finance','Финансы'],['service','Сервис']],"),
 ("finance:'₫'}", "finance:'₫',service:'⚙'}"),
])
p=Path('src/features/prototype/PrototypeApp.tsx');t=p.read_text(encoding='utf-8')
old="""  function setLifecycleStatus(request: RentalRequest, status: RequestStatus) {
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
    if (status === 'active') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'hold' }));
    if (status === 'returned' || status === 'completed') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'ready' }));
  }
"""
new="""  async function ensurePersistedRequest(request: RentalRequest): Promise<RentalRequest> {
    if (request.backendBookingId) return request;
    try {
      const persisted = await createPersistedBooking({ vehicleId: request.vehicleId, from: request.from, to: request.to, client: request.client, contact: request.contact });
      return { ...request, backendBookingId: persisted.bookingId, estimate: persisted.estimatedTotalVnd || request.estimate, paymentStatus: request.paymentStatus ?? 'unpaid' };
    } catch { return request; }
  }

  async function setLifecycleStatus(request: RentalRequest, status: RequestStatus) {
    const synced = status === 'new' ? request : await ensurePersistedRequest(request);
    const backendMap: Partial<Record<RequestStatus,'contacted'|'confirmed'|'vehicle_issued'|'active'|'returned'|'completed'|'cancelled'>> = { contacted:'contacted', confirmed:'confirmed', issued:'vehicle_issued', active:'active', returned:'returned', completed:'completed', cancelled:'cancelled' };
    const backendStatus = backendMap[status];
    if (synced.backendBookingId && backendStatus) {
      try { await updatePersistedBookingStatus(synced.backendBookingId, backendStatus); } catch {}
    }
    setRequests((current) => current.map((item) => {
      if (item.id != request.id) return item;
      const persisted = synced.backendBookingId ? { backendBookingId:synced.backendBookingId, estimate:synced.estimate } : { estimate:synced.estimate };
      return { ...item, ...persisted, status, paymentStatus:item.paymentStatus ?? 'unpaid' };
    }));
    if (status === 'active') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'hold' }));
    if (status === 'returned' || status === 'completed') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'ready' }));
  }

  async function setEmployeeFleetState(vehicle: FleetVehicle, nextState: FleetState) {
    setFleetStates((current) => ({ ...current, [vehicle.id]: nextState }));
    if (nextState !== 'ready') return;
    const candidate = [...requests].reverse().find((item) => item.vehicleId === vehicle.id && ['new','contacted','confirmed'].includes(item.status) && item.paymentStatus !== 'paid');
    if (candidate) await setLifecycleStatus(candidate, 'confirmed');
  }
"""
if new not in t:
    if old not in t: raise SystemExit('lifecycle block missing')
    t=t.replace(old,new,1)
oldfleet="onChange={(event) => setFleetStates((current) => ({ ...current, [vehicle.id]: event.target.value as FleetState }))}"
newfleet="onChange={(event) => { void setEmployeeFleetState(vehicle, event.target.value as FleetState); }}"
if newfleet not in t:
    if oldfleet not in t: raise SystemExit('employee fleet anchor missing')
    t=t.replace(oldfleet,newfleet,1)
t=t.replace("onChange={(event) => setLifecycleStatus(request, event.target.value as RequestStatus)}","onChange={(event) => { void setLifecycleStatus(request, event.target.value as RequestStatus); }}")
for a,b in [
 ("onClick={() => setLifecycleStatus(request,'active')}","onClick={() => { void setLifecycleStatus(request,'active'); }}"),
 ("onClick={() => setLifecycleStatus(request,'returned')}","onClick={() => { void setLifecycleStatus(request,'returned'); }}"),
 ("onClick={() => setLifecycleStatus(request,'completed')}","onClick={() => { void setLifecycleStatus(request,'completed'); }}")]: t=t.replace(a,b)
anchor="""  function ownerFinance() {
    return <OwnerFinance/>;
  }
"""
if 'function ownerService()' not in t:
    t=t.replace(anchor,anchor+"""
  function ownerService() {
    return <OwnerService fleet={fleet} setFleetStates={setFleetStates}/>;
  }
""",1)
oldroute="else content = route === 'requests' ? requestsPage() : route === 'fleet' ? ownerFleet() : route === 'calendar' ? ownerCalendar() : route === 'customers' ? ownerCustomers() : route === 'team' ? ownerTeam() : route === 'finance' ? ownerFinance() : ownerOverview();"
newroute="else content = route === 'requests' ? requestsPage() : route === 'fleet' ? ownerFleet() : route === 'calendar' ? ownerCalendar() : route === 'customers' ? ownerCustomers() : route === 'team' ? ownerTeam() : route === 'finance' ? ownerFinance() : route === 'service' ? ownerService() : ownerOverview();"
if newroute not in t:
    if oldroute not in t: raise SystemExit('owner route anchor missing')
    t=t.replace(oldroute,newroute,1)
p.write_text(t,encoding='utf-8')

patch('src/main.tsx',[("import './features/finance/owner-finance.css';", "import './features/finance/owner-finance.css';\nimport './features/service/owner-service.css';")])
patch('src/worker.ts',[
 ("import { handleFinanceRequest } from './api/financeWorker.js';", "import { handleFinanceRequest } from './api/financeWorker.js';\nimport { handleServiceRequest } from './api/serviceWorker.js';"),
 ("schemaVersion: env.DB ? 8 : null", "schemaVersion: env.DB ? 9 : null"),
 ("deposits: true", "deposits: true, serviceManagement: true, serviceInspections: true, serviceExpenses: true"),
 ("    const financeResponse = await handleFinanceRequest(request, env, url);\n    if (financeResponse) return financeResponse;", "    const financeResponse = await handleFinanceRequest(request, env, url);\n    if (financeResponse) return financeResponse;\n    const serviceResponse = await handleServiceRequest(request, env, url);\n    if (serviceResponse) return serviceResponse;"),
])

tests=Path('tests/domain.test.mjs');t=tests.read_text(encoding='utf-8')
if "stage 9 service and payment readiness contracts are present" not in t:
 t += """\n\ntest('stage 9 service and payment readiness contracts are present',async()=>{\n const migration=await readFile(new URL('../migrations/0009_stage9_service.sql',import.meta.url),'utf8');\n const service=await readFile(new URL('../src/api/serviceWorker.ts',import.meta.url),'utf8');\n const ui=await readFile(new URL('../src/features/service/OwnerService.tsx',import.meta.url),'utf8');\n const app=await readFile(new URL('../src/features/prototype/PrototypeApp.tsx',import.meta.url),'utf8');\n const pay=await readFile(new URL('../src/features/payments/PaymentCheckout.tsx',import.meta.url),'utf8');\n assert.ok(migration.includes('vehicle_inspections'));\n assert.ok(service.includes('/api/owner/service'));\n assert.ok(service.includes('service_expense'));\n assert.ok(ui.includes('data-stage9-service'));\n assert.ok(app.includes('setEmployeeFleetState'));\n assert.ok(app.includes('updatePersistedBookingStatus'));\n assert.ok(pay.includes('ProviderLogo'));\n});\n"""
 tests.write_text(t,encoding='utf-8')

road=Path('DEVELOPMENT_ROADMAP.md');t=road.read_text(encoding='utf-8')
old='### ⏳ Stage 9 — Service\nMaintenance, repairs, inspections, expenses.\n'
new='''### 🚧 Stage 9 — Service\nMaintenance, repairs, inspections, expenses.\n\nAcceptance target:\n- employee Ready for handover synchronizes the related booking and unlocks client payment checkout;\n- payment selector shows brand marks for all seven payment providers;\n- owner Service section covers maintenance, repair, inspection, cleaning and other work;\n- service start marks the vehicle in service and blocks availability;\n- service completion returns the vehicle to the fleet, records mileage and next service;\n- completed service cost creates a service_expense finance transaction;\n- service inspection checklist is stored with the service record;\n- Stage 9 browser acceptance passes on mobile and desktop before deployment.\n'''
if old in t:t=t.replace(old,new,1)
road.write_text(t,encoding='utf-8')
