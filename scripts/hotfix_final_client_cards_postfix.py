from pathlib import Path
p=Path('src/features/crm/OwnerCRM.tsx')
text=p.read_text(encoding='utf-8')
old='<button type="button" className="crm-history-link" data-rental-history={customer.id} onClick={(event) => { event.stopPropagation(); openRentalHistory(customer.id); }}>{customer.rentalCount} {customer.rentalCount === 1 ? \'аренда\' : \'аренд\'} · история</button>'
new='<span role="button" tabIndex={0} className="crm-history-link" data-rental-history={customer.id} onClick={(event) => { event.stopPropagation(); openRentalHistory(customer.id); }} onKeyDown={(event) => { if (event.key === \'Enter\' || event.key === \' \') { event.preventDefault(); event.stopPropagation(); openRentalHistory(customer.id); } }}>{customer.rentalCount} {customer.rentalCount === 1 ? \'аренда\' : \'аренд\'} · история</span>'
if old in text:
    text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')
print('CRM history link postfix applied')
