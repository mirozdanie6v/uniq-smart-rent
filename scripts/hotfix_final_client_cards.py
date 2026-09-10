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
row_open="{filtered.map((customer) => <button className={`crm-row ${selectedId === customer.id ? 'selected' : ''}`} key={customer.id} onClick={() => setSelectedId(customer.id)}>"
row_new="{filtered.map((customer) => <article role=\"button\" tabIndex={0} className={`crm-row ${selectedId === customer.id ? 'selected' : ''}`} key={customer.id} onClick={() => openCustomer(customer.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openCustomer(customer.id); } }}>"
if row_open not in text: raise SystemExit('CRM row anchor missing')
text=text.replace(row_open,row_new,1)
value_old="<div className=\"crm-value\"><b>{formatMoney(customer.lifetimeValueVnd)}</b><small>{customer.rentalCount} {customer.rentalCount === 1 ? 'аренда' : 'аренд'}</small></div>"
value_new="<div className=\"crm-value\"><b>{formatMoney(customer.lifetimeValueVnd)}</b><button type=\"button\" className=\"crm-history-link\" data-rental-history={customer.id} onClick={(event) => { event.stopPropagation(); openRentalHistory(customer.id); }}>{customer.rentalCount} {customer.rentalCount === 1 ? 'аренда' : 'аренд'} · история</button></div>"
if value_old not in text: raise SystemExit('CRM value anchor missing')
text=text.replace(value_old,value_new,1)
text=text.replace('<span className="crm-arrow">›</span>\n        </button>)}','<span className="crm-arrow">›</span>\n        </article>)}',1)
text=text.replace('<button className="crm-close" aria-label="Закрыть карточку клиента" onClick={() => setSelectedId(null)}>×</button>','<button className="crm-close" aria-label="Закрыть карточку клиента" onClick={closeCustomer}>×</button>',1)
end_anchor="      </aside>\n    </section>\n  </div>;"
overlay="""      </aside>
      {selected && historyFocusId === selected.id ? <section className="crm-history-overlay history-focused" data-owner-rental-history-panel>
        <header className="crm-history-overlay-head" data-rental-history-focus><div><span className="eyebrow">ИСТОРИЯ АРЕНД</span><h2>{selected.name}</h2><p>{selected.country} · {selected.language} · {selected.rentalCount} {selected.rentalCount === 1 ? 'аренда' : 'аренд'}</p></div><button type="button" className="crm-history-overlay-close" aria-label="Закрыть историю" onClick={closeCustomer}>×</button></header>
        <button type="button" className="secondary crm-history-back" data-back-customer-card onClick={() => setHistoryFocusId(null)}>← Карточка клиента</button>
        <div className="crm-timeline crm-history-overlay-timeline" data-owner-rental-history>{timeline.map((item) => <article key={item.id} className={item.tone}><i></i><div><span>{formatDate(item.date)}</span><b>{item.title}</b><p>{item.text}</p>{item.amount ? <strong>{formatMoney(item.amount)}</strong> : null}</div></article>)}</div>
      </section> : null}
    </section>
  </div>;"""
if end_anchor not in text: raise SystemExit('CRM overlay insertion anchor missing')
text=text.replace(end_anchor,overlay,1)
p.write_text(text,encoding='utf-8')

p=Path('src/features/crm/owner-crm.css')
css=p.read_text(encoding='utf-8')
css += "\n.crm-row:focus-visible{outline:2px solid rgba(88,214,145,.7);outline-offset:2px}.crm-history-link{border:0;background:transparent;color:#adffc8;padding:2px 0;font:inherit;font-size:9px;font-weight:800;text-align:right;cursor:pointer;text-decoration:underline;text-underline-offset:2px}.crm-history-overlay{position:fixed;z-index:180;inset:0;background:linear-gradient(180deg,#10211e,#08100f);overflow:auto;padding:clamp(22px,4vw,46px);color:#fff}.crm-history-overlay-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;max-width:900px;margin:0 auto}.crm-history-overlay-head h2{margin:6px 0 4px;font-size:clamp(28px,5vw,46px);letter-spacing:-.04em}.crm-history-overlay-head p{margin:0;color:rgba(255,255,255,.52)}.crm-history-overlay-close{flex:0 0 42px;width:42px;height:42px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(255,255,255,.06);color:#fff;font-size:24px}.crm-history-back{display:flex;align-items:center;justify-content:center;width:max-content;min-height:42px;margin:18px auto 12px}.crm-history-overlay-timeline{max-width:900px;margin:0 auto!important;padding:4px 0 36px}.crm-history-overlay-timeline article{padding:12px 0}.crm-history-overlay-timeline b{font-size:14px}.crm-history-overlay-timeline p{font-size:12px;line-height:1.45}@media(max-width:700px){.crm-history-overlay{padding:20px 16px calc(26px + env(safe-area-inset-bottom,0px))}.crm-history-overlay-head h2{font-size:28px}.crm-history-back{margin:14px 0 10px}.crm-history-overlay-timeline{margin:0!important}.crm-history-overlay-timeline article{padding:10px 0}}\n"
p.write_text(css,encoding='utf-8')

p=Path('styles.css')
text=p.read_text(encoding='utf-8')
text += "\n.metric-link{appearance:none;width:100%;text-align:left;color:inherit;font:inherit;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}.metric-link:hover,.metric-link:focus-visible{transform:translateY(-2px);border-color:rgba(32,227,143,.35);background:rgba(32,227,143,.07);outline:none}.metric-link:active{transform:translateY(0)}\n"
p.write_text(text,encoding='utf-8')

p=Path('tests/domain.test.mjs')
text=p.read_text(encoding='utf-8')
if "final client hero and clickable dashboard cards contracts" not in text:
    text += """\n\ntest('final client hero and clickable dashboard cards contracts',async()=>{\n  const app=await readFile(new URL('../src/features/prototype/PrototypeApp.tsx',import.meta.url),'utf8');\n  const crm=await readFile(new URL('../src/features/crm/OwnerCRM.tsx',import.meta.url),'utf8');\n  assert.ok(app.includes('Весь парк UNIQ — прямо в Telegram.'));\n  assert.ok(app.includes('Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.'));\n  assert.ok(app.includes('data-metric-target'));\n  assert.ok(app.includes('employee-handover'));\n  assert.ok(app.includes('owner-analytics'));\n  assert.ok(crm.includes('data-rental-history'));\n  assert.ok(crm.includes('data-owner-rental-history'));\n  assert.ok(crm.includes('crm-history-overlay'));\n});\n"""
p.write_text(text,encoding='utf-8')
print('hotfix final client/cards/history overlay applied')
