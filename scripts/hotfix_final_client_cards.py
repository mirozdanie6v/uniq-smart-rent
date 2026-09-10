from pathlib import Path

p=Path('src/features/prototype/PrototypeApp.tsx')
text=p.read_text(encoding='utf-8')
text=text.replace("function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {\n  return <div className=\"metric\"><span>{label}</span><b>{value}</b>{sub ? <small>{sub}</small> : null}</div>;\n}","function Metric({ label, value, sub, onClick, target }: { label: string; value: React.ReactNode; sub?: string; onClick?: () => void; target?: string }) {\n  const content = <><span>{label}</span><b>{value}</b>{sub ? <small>{sub}</small> : null}</>;\n  return onClick ? <button type=\"button\" className=\"metric metric-link\" data-metric-target={target} onClick={onClick}>{content}</button> : <div className=\"metric\">{content}</div>;\n}")
text=text.replace("<section className=\"metrics\"><Metric label=\"Открытые заявки\" value={open.length}/><Metric label=\"Парк\" value={operationalFleet.length}/><Metric label=\"Готовы к выдаче\" value={ready}/></section>","<section className=\"metrics\"><Metric label=\"Открытые заявки\" value={open.length} target=\"employee-requests\" onClick={() => go('requests')}/><Metric label=\"Парк\" value={operationalFleet.length} target=\"employee-fleet\" onClick={() => go('fleet')}/><Metric label=\"Готовы к выдаче\" value={ready} target=\"employee-handover\" onClick={() => go('handover')}/></section>")
text=text.replace("<section className=\"metrics owner-metrics\"><Metric label=\"Парк\" value={fleet.length} sub=\"единиц техники\"/><Metric label=\"Открытые заявки\" value={open}/><Metric label=\"Подтверждены\" value={confirmed}/><Metric label=\"Потенциал заявок\" value={money(estimate)} sub=\"по текущим тарифам\"/></section>","<section className=\"metrics owner-metrics\"><Metric label=\"Парк\" value={fleet.length} sub=\"единиц техники\" target=\"owner-fleet\" onClick={() => go('fleet')}/><Metric label=\"Открытые заявки\" value={open} target=\"owner-requests\" onClick={() => go('requests')}/><Metric label=\"Подтверждены\" value={confirmed} target=\"owner-calendar\" onClick={() => go('calendar')}/><Metric label=\"Потенциал заявок\" value={money(estimate)} sub=\"по текущим тарифам\" target=\"owner-analytics\" onClick={() => go('analytics')}/></section>")
hero='<Hero label="UNIQ SMART RENT · NHA TRANG" title="Весь парк UNIQ — прямо в Telegram." text="Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App."'
if hero not in text:
    raise SystemExit('final client hero anchor missing')
p.write_text(text,encoding='utf-8')

p=Path('src/features/crm/OwnerCRM.tsx')
text=p.read_text(encoding='utf-8')
text=text.replace("  const [selectedId, setSelectedId] = useState<string | null>(null);\n  const [overrides, setOverrides]", "  const [selectedId, setSelectedId] = useState<string | null>(null);\n  const [historyFocusId, setHistoryFocusId] = useState<string | null>(null);\n  const [overrides, setOverrides]")
anchor="  const timeline = selected ? timelineForCustomer(selected, requests, fleet) : [];\n"
insert="  const timeline = selected ? timelineForCustomer(selected, requests, fleet) : [];\n\n  function openCustomer(customerId: string) {\n    setHistoryFocusId(null);\n    setSelectedId(customerId);\n  }\n\n  function openRentalHistory(customerId: string) {\n    setSelectedId(customerId);\n    setHistoryFocusId(customerId);\n  }\n\n  function closeCustomer() {\n    setSelectedId(null);\n    setHistoryFocusId(null);\n  }\n"
if anchor not in text: raise SystemExit('timeline anchor missing')
text=text.replace(anchor,insert,1)
text=text.replace("onClick={() => setSelectedId(customer.id)}", "onClick={() => openCustomer(customer.id)}")
text=text.replace("<aside className={`crm-detail ${selected ? 'open' : ''}`}>", "<aside className={`crm-detail ${selected ? 'open' : ''} ${selected && historyFocusId === selected.id ? 'history-focused' : ''}`} data-owner-rental-history-panel>")
text=text.replace("<button className=\"crm-close\" aria-label=\"Закрыть карточку клиента\" onClick={() => setSelectedId(null)}>×</button>", "<button className=\"crm-close\" aria-label=\"Закрыть карточку клиента\" onClick={closeCustomer}>×</button>{historyFocusId === selected.id ? <div className=\"crm-history-focus-head\" data-rental-history-focus><span className=\"eyebrow\">ИСТОРИЯ АРЕНД</span><h2>{selected.name}</h2><button type=\"button\" className=\"secondary\" data-back-customer-card onClick={() => setHistoryFocusId(null)}>← Карточка клиента</button></div> : null}")
text=text.replace("<div className=\"crm-profile-head\"><div className=\"crm-avatar large\">{selected.name.split(/\\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div><span className=\"eyebrow\">КАРТОЧКА КЛИЕНТА</span><h2>{selected.name}</h2><p>{selected.country} · {selected.language}</p></div></div>", "<div className=\"crm-profile-head\"><div className=\"crm-avatar large\">{selected.name.split(/\\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div><span className=\"eyebrow\">КАРТОЧКА КЛИЕНТА</span><h2>{selected.name}</h2><p>{selected.country} · {selected.language}</p><button type=\"button\" className=\"crm-history-top\" data-open-rental-history onClick={() => openRentalHistory(selected.id)}>История аренд →</button></div></div>")
text=text.replace("<div className=\"crm-timeline\">{timeline.map", "<div className=\"crm-timeline\" data-owner-rental-history>{timeline.map")
p.write_text(text,encoding='utf-8')

p=Path('src/features/crm/owner-crm.css')
text=p.read_text(encoding='utf-8')
text += "\n.crm-history-top{margin-top:8px;padding:0;border:0;background:transparent;color:#adffc8;font:inherit;font-size:11px;font-weight:800;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.crm-history-focus-head{padding:4px 42px 12px 0}.crm-history-focus-head h2{margin:6px 0 12px;font-size:23px}.crm-history-focus-head .secondary{min-height:38px;padding:0 12px;font-size:10px}.crm-detail.history-focused .crm-profile-head,.crm-detail.history-focused .crm-profile-stats,.crm-detail.history-focused .crm-contact-grid,.crm-detail.history-focused .crm-edit-field,.crm-detail.history-focused .crm-timeline-head{display:none}.crm-detail.history-focused .crm-timeline{margin-top:4px}.crm-detail.history-focused .crm-timeline article:first-child{padding-top:0}\n"
p.write_text(text,encoding='utf-8')

p=Path('styles.css')
text=p.read_text(encoding='utf-8')
text += "\n.metric-link{appearance:none;width:100%;text-align:left;color:inherit;font:inherit;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}.metric-link:hover,.metric-link:focus-visible{transform:translateY(-2px);border-color:rgba(32,227,143,.35);background:rgba(32,227,143,.07);outline:none}.metric-link:active{transform:translateY(0)}\n"
p.write_text(text,encoding='utf-8')

p=Path('tests/domain.test.mjs')
text=p.read_text(encoding='utf-8')
if "final client hero and clickable dashboard cards contracts" not in text:
    text += """\n\ntest('final client hero and clickable dashboard cards contracts',async()=>{\n  const app=await readFile(new URL('../src/features/prototype/PrototypeApp.tsx',import.meta.url),'utf8');\n  const crm=await readFile(new URL('../src/features/crm/OwnerCRM.tsx',import.meta.url),'utf8');\n  assert.ok(app.includes('Весь парк UNIQ — прямо в Telegram.'));\n  assert.ok(app.includes('Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.'));\n  assert.ok(app.includes('data-metric-target'));\n  assert.ok(app.includes('employee-handover'));\n  assert.ok(app.includes('owner-analytics'));\n  assert.ok(crm.includes('data-owner-rental-history'));\n  assert.ok(crm.includes('data-open-rental-history'));\n  assert.ok(crm.includes('data-rental-history-focus'));\n});\n"""
p.write_text(text,encoding='utf-8')
print('hotfix final client/cards/history applied')
