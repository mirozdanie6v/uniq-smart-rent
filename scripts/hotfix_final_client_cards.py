from pathlib import Path

p=Path('src/features/prototype/PrototypeApp.tsx')
text=p.read_text(encoding='utf-8')
text=text.replace("function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {\n  return <div className=\"metric\"><span>{label}</span><b>{value}</b>{sub ? <small>{sub}</small> : null}</div>;\n}","function Metric({ label, value, sub, onClick, target }: { label: string; value: React.ReactNode; sub?: string; onClick?: () => void; target?: string }) {\n  const content = <><span>{label}</span><b>{value}</b>{sub ? <small>{sub}</small> : null}</>;\n  return onClick ? <button type=\"button\" className=\"metric metric-link\" data-metric-target={target} onClick={onClick}>{content}</button> : <div className=\"metric\">{content}</div>;\n}")
text=text.replace("<section className=\"metrics\"><Metric label=\"Открытые заявки\" value={open.length}/><Metric label=\"Парк\" value={operationalFleet.length}/><Metric label=\"Готовы к выдаче\" value={ready}/></section>","<section className=\"metrics\"><Metric label=\"Открытые заявки\" value={open.length} target=\"employee-requests\" onClick={() => go('requests')}/><Metric label=\"Парк\" value={operationalFleet.length} target=\"employee-fleet\" onClick={() => go('fleet')}/><Metric label=\"Готовы к выдаче\" value={ready} target=\"employee-handover\" onClick={() => go('handover')}/></section>")
text=text.replace("<section className=\"metrics owner-metrics\"><Metric label=\"Парк\" value={fleet.length} sub=\"единиц техники\"/><Metric label=\"Открытые заявки\" value={open}/><Metric label=\"Подтверждены\" value={confirmed}/><Metric label=\"Потенциал заявок\" value={money(estimate)} sub=\"по текущим тарифам\"/></section>","<section className=\"metrics owner-metrics\"><Metric label=\"Парк\" value={fleet.length} sub=\"единиц техники\" target=\"owner-fleet\" onClick={() => go('fleet')}/><Metric label=\"Открытые заявки\" value={open} target=\"owner-requests\" onClick={() => go('requests')}/><Metric label=\"Подтверждены\" value={confirmed} target=\"owner-calendar\" onClick={() => go('calendar')}/><Metric label=\"Потенциал заявок\" value={money(estimate)} sub=\"по текущим тарифам\" target=\"owner-analytics\" onClick={() => go('analytics')}/></section>")
# exact final client hero copy: keep it as product source of truth even if already present
old='<Hero label="UNIQ SMART RENT · NHA TRANG" title="Весь парк UNIQ — прямо в Telegram." text="Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App."'
if old not in text:
    raise SystemExit('final client hero anchor missing')
p.write_text(text,encoding='utf-8')

p=Path('src/features/crm/OwnerCRM.tsx')
text=p.read_text(encoding='utf-8')
text=text.replace("import { useMemo, useState } from 'react';","import { useEffect, useMemo, useRef, useState } from 'react';")
text=text.replace("  const [overrides, setOverrides] = useState<Record<string, Partial<Customer>>>(() => loadOverrides());","  const [overrides, setOverrides] = useState<Record<string, Partial<Customer>>>(() => loadOverrides());\n  const detailRef = useRef<HTMLElement | null>(null);\n  const timelineRef = useRef<HTMLDivElement | null>(null);")
anchor="  const timeline = selected ? timelineForCustomer(selected, requests, fleet) : [];\n"
insert="  const timeline = selected ? timelineForCustomer(selected, requests, fleet) : [];\n\n  useEffect(() => {\n    if (!selectedId) return;\n    detailRef.current?.scrollTo({ top:0, behavior:'instant' as ScrollBehavior });\n  }, [selectedId]);\n\n  function openRentalHistory(customerId: string) {\n    setSelectedId(customerId);\n    window.setTimeout(() => {\n      const detail = detailRef.current;\n      const timeline = timelineRef.current;\n      if (!detail || !timeline) return;\n      const top = Math.max(0, timeline.offsetTop - 16);\n      detail.scrollTo({ top, behavior:'smooth' });\n    }, 60);\n  }\n"
if anchor not in text: raise SystemExit('timeline anchor missing')
text=text.replace(anchor,insert,1)
text=text.replace("<div className=\"crm-value\"><b>{formatMoney(customer.lifetimeValueVnd)}</b><small>{customer.rentalCount} {customer.rentalCount === 1 ? 'аренда' : 'аренд'}</small></div>","<div className=\"crm-value\"><b>{formatMoney(customer.lifetimeValueVnd)}</b><button type=\"button\" className=\"crm-history-link\" data-rental-history={customer.id} onClick={(event) => { event.stopPropagation(); openRentalHistory(customer.id); }}>{customer.rentalCount} {customer.rentalCount === 1 ? 'аренда' : 'аренд'} · история</button></div>")
text=text.replace("<aside className={`crm-detail ${selected ? 'open' : ''}`}>","<aside ref={detailRef} className={`crm-detail ${selected ? 'open' : ''}`} data-owner-rental-history-panel>")
text=text.replace("<div className=\"crm-profile-stats\"><article><span>Аренд</span><b>{selected.rentalCount}</b></article>","<div className=\"crm-profile-stats\"><button type=\"button\" data-open-rental-history onClick={() => openRentalHistory(selected.id)}><span>Аренд</span><b>{selected.rentalCount}</b><small>Открыть историю</small></button>")
text=text.replace("<div className=\"crm-timeline\">{timeline.map", "<div ref={timelineRef} className=\"crm-timeline\" data-owner-rental-history>{timeline.map")
p.write_text(text,encoding='utf-8')

p=Path('src/features/crm/owner-crm.css')
text=p.read_text(encoding='utf-8')
text += "\n.crm-history-link{border:0;background:transparent;color:#adffc8;padding:0;font:inherit;font-size:10px;text-align:right;cursor:pointer;text-decoration:underline;text-underline-offset:2px}.crm-profile-stats button{padding:12px;border:0;border-radius:15px;background:rgba(88,214,145,.08);color:#fff;display:grid;gap:5px;text-align:left;cursor:pointer}.crm-profile-stats button:hover{background:rgba(88,214,145,.13)}.crm-profile-stats button span{font-size:11px;color:rgba(255,255,255,.5)}.crm-profile-stats button b{font-size:13px}.crm-profile-stats button small{font-size:9px;color:#adffc8}.crm-timeline{scroll-margin-top:12px}\n"
p.write_text(text,encoding='utf-8')

p=Path('styles.css')
text=p.read_text(encoding='utf-8')
text += "\n.metric-link{appearance:none;width:100%;text-align:left;color:inherit;font:inherit;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}.metric-link:hover,.metric-link:focus-visible{transform:translateY(-2px);border-color:rgba(32,227,143,.35);background:rgba(32,227,143,.07);outline:none}.metric-link:active{transform:translateY(0)}\n"
p.write_text(text,encoding='utf-8')

p=Path('tests/domain.test.mjs')
text=p.read_text(encoding='utf-8')
if "final client hero and clickable dashboard cards contracts" not in text:
    text += """\n\ntest('final client hero and clickable dashboard cards contracts',async()=>{\n  const app=await readFile(new URL('../src/features/prototype/PrototypeApp.tsx',import.meta.url),'utf8');\n  const crm=await readFile(new URL('../src/features/crm/OwnerCRM.tsx',import.meta.url),'utf8');\n  assert.ok(app.includes('Весь парк UNIQ — прямо в Telegram.'));\n  assert.ok(app.includes('Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.'));\n  assert.ok(app.includes('data-metric-target'));\n  assert.ok(app.includes('employee-handover'));\n  assert.ok(app.includes('owner-analytics'));\n  assert.ok(crm.includes('data-owner-rental-history'));\n  assert.ok(crm.includes('data-open-rental-history'));\n});\n"""
p.write_text(text,encoding='utf-8')
print('hotfix final client/cards/history applied')
