from pathlib import Path

p = Path('src/features/prototype/PrototypeApp.tsx')
text = p.read_text(encoding='utf-8')

def once(old: str, new: str, label: str):
    global text
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'missing anchor: {label}')
    text = text.replace(old, new, 1)

once("import { OwnerAnalytics } from '../analytics/OwnerAnalytics';", "import { OwnerAnalytics } from '../analytics/OwnerAnalytics';\nimport { RequestDetailModal } from '../requests/RequestDetailModal';\nimport { VehicleModelDetails } from '../fleet/VehicleModelDetails';", 'imports')

text = text.replace("status:'contacted'", "status:'new'")
text = text.replace("contacted:'Связались'", "contacted:'Новая'")
text = text.replace("['new','contacted','confirmed','issued','active','return_due','returned','completed','cancelled']", "['new','confirmed','issued','active','return_due','returned','completed','cancelled']")

once("  const [paymentPurpose, setPaymentPurpose] = useState<PaymentPurpose>('booking');\n  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);", "  const [paymentPurpose, setPaymentPurpose] = useState<PaymentPurpose>('booking');\n  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);\n  const [requestDetailFocus, setRequestDetailFocus] = useState<'request' | 'client'>('request');\n  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);", 'detail state')

once("  const paymentRequest = paymentRequestId ? requests.find((item) => item.id === paymentRequestId) : undefined;\n  const paymentVehicle = paymentRequest ? fleet.find((item) => item.id === paymentRequest.vehicleId) : undefined;", "  const paymentRequest = paymentRequestId ? requests.find((item) => item.id === paymentRequestId) : undefined;\n  const paymentVehicle = paymentRequest ? fleet.find((item) => item.id === paymentRequest.vehicleId) : undefined;\n  const selectedDetailRequest = selectedRequestId ? requests.find((item) => item.id === selectedRequestId) : undefined;\n  const selectedDetailVehicle = selectedDetailRequest ? fleet.find((item) => item.id === selectedDetailRequest.vehicleId) : undefined;", 'detail selectors')

once("<Hero label=\"UNIQ SMART RENT · NHA TRANG\" title=\"Весь парк UNIQ — прямо в Telegram.\" text=\"Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.\" aside={", "<Hero label=\"UNIQ SMART RENT · NHA TRANG\" title=\"Техника для Нячанга — бронь за пару минут.\" text=\"Выберите модель и даты, оплатите бронь, продлевайте аренду и управляйте поездкой прямо в Telegram.\" aside={", 'client hero')

old_detail = "<button className=\"primary wide\" data-book={vehicle.id} onClick={() => setBookingVehicleId(vehicle.id)}>Запросить бронь</button>{vehicle.sourceUrl ? <a className=\"source-link\" href={vehicle.sourceUrl} target=\"_blank\" rel=\"noreferrer\">Подробнее о модели ↗</a> : null}"
new_detail = "<button className=\"primary wide\" data-book={vehicle.id} onClick={() => setBookingVehicleId(vehicle.id)}>Запросить бронь</button><VehicleModelDetails vehicle={vehicle} fleetState={effectiveFleetState(vehicle.id)}/>"
once(old_detail, new_detail, 'vehicle dossier')

once("    return <article className=\"request\" key={request.id}>", "    return <article className=\"request request-clickable\" key={request.id} data-request-card={request.id} tabIndex={0} onClick={(event) => { if ((event.target as HTMLElement).closest('button,a,input,select,textarea,label')) return; setSelectedRequestId(request.id); setRequestDetailFocus('request'); }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedRequestId(request.id); setRequestDetailFocus('request'); } }}>", 'request clickable')

once("      <p>{request.from} → {request.to} · {request.client || 'Клиент'}</p>", "      <p>{request.from} → {request.to} · <button type=\"button\" className=\"request-client-link\" data-request-client={request.id} onClick={(event) => { event.stopPropagation(); setSelectedRequestId(request.id); setRequestDetailFocus('client'); }}>{request.client || 'Клиент'}</button></p><small className=\"request-open-hint\">Открыть заявку →</small>", 'client link')

once("    {extendingRequest && extendingVehicle ? <ExtensionModal request={extendingRequest} vehicle={extendingVehicle} clientMode={role === 'client'} onClose={() => setExtendingRequestId(null)} onSubmit={(newTo, additional) => extendRentalRequest(extendingRequest,newTo,additional)}/>: null}\n    <ScrollTop/>", "    {extendingRequest && extendingVehicle ? <ExtensionModal request={extendingRequest} vehicle={extendingVehicle} clientMode={role === 'client'} onClose={() => setExtendingRequestId(null)} onSubmit={(newTo, additional) => extendRentalRequest(extendingRequest,newTo,additional)}/>: null}\n    {selectedDetailRequest ? <RequestDetailModal request={selectedDetailRequest} vehicleTitle={selectedDetailVehicle?.title ?? selectedDetailRequest.vehicleId} statusLabel={statusText(selectedDetailRequest.status)} paymentLabel={paymentStatusText(selectedDetailRequest.paymentStatus)} relatedRequests={requests.filter((item) => (item.client && item.client === selectedDetailRequest.client) || (item.contact && item.contact === selectedDetailRequest.contact))} focus={requestDetailFocus} onClose={() => setSelectedRequestId(null)}/>: null}\n    <ScrollTop/>", 'request detail modal')

p.write_text(text, encoding='utf-8')

# Guard: the removed visible status must not exist in the current UI source.
if 'Связались' in text:
    raise SystemExit('visible Связались status still present')
if "['new','contacted','confirmed'" in text:
    raise SystemExit('contacted still selectable')
print('UX request/vehicle patch applied')
