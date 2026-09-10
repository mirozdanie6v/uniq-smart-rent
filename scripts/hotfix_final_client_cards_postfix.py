from pathlib import Path

p=Path('src/features/crm/OwnerCRM.tsx')
text=p.read_text(encoding='utf-8')
old='<button type="button" className="crm-history-link" data-rental-history={customer.id} onClick={(event) => { event.stopPropagation(); openRentalHistory(customer.id); }}>{customer.rentalCount} {customer.rentalCount === 1 ? \'аренда\' : \'аренд\'} · история</button>'
new='<span role="button" tabIndex={0} className="crm-history-link" data-rental-history={customer.id} onClick={(event) => { event.stopPropagation(); openRentalHistory(customer.id); }} onKeyDown={(event) => { if (event.key === \'Enter\' || event.key === \' \') { event.preventDefault(); event.stopPropagation(); openRentalHistory(customer.id); } }}>{customer.rentalCount} {customer.rentalCount === 1 ? \'аренда\' : \'аренд\'} · история</span>'
if old in text:
    text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

p=Path('src/features/crm/owner-crm.css')
css=p.read_text(encoding='utf-8')
marker='.crm-detail.history-focused{position:fixed!important;inset:0!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:100dvh!important;max-height:100dvh!important;transform:none!important;z-index:160!important;border-radius:0!important;overflow:auto!important;padding:54px 18px 24px!important}'
if marker not in css:
    css += '\n@media(max-width:1100px){'+marker+'.crm-detail.history-focused .crm-history-focus-head{position:relative;margin:0;padding:0 46px 14px 0;min-height:0}.crm-detail.history-focused .crm-history-focus-head h2{margin:5px 0 10px}.crm-detail.history-focused .crm-timeline{margin:0!important;padding-top:0}.crm-detail.history-focused .crm-close{position:fixed;top:10px;right:12px;z-index:170}.crm-detail.history-focused .crm-timeline article:first-child{padding-top:2px}}\n'
p.write_text(css,encoding='utf-8')
print('CRM history mobile full-screen postfix applied')
