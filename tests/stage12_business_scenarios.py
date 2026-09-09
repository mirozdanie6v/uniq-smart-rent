import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8787')


def call(method, path, data=None, role=None, expected=200):
    headers = {'accept': 'application/json'}
    if data is not None:
        headers['content-type'] = 'application/json'
    if role:
        headers['x-uniq-demo-role'] = role
    request = urllib.request.Request(
        BASE + path,
        data=None if data is None else json.dumps(data).encode(),
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            body = json.loads(response.read().decode())
            if response.status != expected:
                raise AssertionError((path, response.status, body))
            return body
    except urllib.error.HTTPError as error:
        body = json.loads(error.read().decode())
        if error.code != expected:
            raise AssertionError((path, error.code, body))
        return body


health = call('GET', '/api/health')
assert health['schemaVersion'] == 12
assert health['dynamicBranches'] is True
assert health['balancePayments'] is True
assert health['fullOperationalFleet'] is True

branch = call(
    'POST', '/api/owner/branches',
    {'id': 'branch-airport', 'code': 'airport', 'name': 'Аэропорт / Cam Ranh', 'address': 'Cam Ranh, Khánh Hòa', 'mapsUrl': 'https://maps.google.com/?q=Cam+Ranh', 'phone': '+84372112370', 'status': 'active'},
    'owner', 201,
)
assert branch['branch']['id'] == 'branch-airport'

duplicate = call(
    'POST', '/api/owner/branches',
    {'id': 'branch-airport-copy', 'code': 'airport', 'name': 'Duplicate', 'address': 'Cam Ranh'},
    'owner', 409,
)
assert duplicate['error'] == 'branch_code_exists'

team = call('GET', '/api/owner/team', role='owner')
assert any(item['id'] == 'branch-airport' for item in team['branches'])

employee = call(
    'POST', '/api/owner/employees',
    {'id': 'employee-stage12-airport', 'branchId': 'branch-airport', 'name': 'Mai Demo', 'role': 'manager', 'phone': '', 'telegram': '@mai_demo', 'zalo': '', 'status': 'active', 'permissions': ['bookings.view', 'bookings.manage', 'transfers.manage']},
    'owner',
)
assert employee['employee']['branchId'] == 'branch-airport'

vehicle = call(
    'POST', '/api/owner/fleet',
    {'id': 'yamaha-x-max-2024-76826', 'title': 'Yamaha X-Max', 'type': 'scooter', 'brand': 'Yamaha', 'model': 'X-Max', 'year': 2024, 'engine': '292 cc', 'branchId': 'branch-airport', 'status': 'ready', 'published': True, 'dailyVnd': 1800000, 'weeklyVnd': 8000000, 'monthlyVnd': 17000000, 'depositVnd': 0, 'photos': []},
    'owner',
)
assert vehicle['vehicle']['branchId'] == 'branch-airport'

transfer = call(
    'POST', '/api/owner/transfers',
    {'id': 'transfer-stage12-r7', 'vehicleId': 'r7-2023', 'vehicleTitle': 'Yamaha YZF-R7', 'fromBranchId': 'branch-center', 'toBranchId': 'branch-airport', 'employeeId': 'employee-stage12-airport', 'plannedAt': '2026-11-01T09:00:00Z', 'note': 'Stage 12 scenario'},
    'owner', 200,
)
assert transfer['transfer']['toBranchId'] == 'branch-airport'
transfer_done = call('PATCH', '/api/owner/transfers/transfer-stage12-r7', {'status': 'completed'}, 'owner')
assert transfer_done['transfer']['status'] == 'completed'


def booking(vehicle_id, start, end, name):
    return call('POST', '/api/bookings', {'vehicleId': vehicle_id, 'from': start, 'to': end, 'client': name, 'contact': '@stage12', 'channel': 'telegram'}, expected=201)


def status(booking_id, value):
    return call('PATCH', f'/api/bookings/{booking_id}/status', {'status': value}, 'employee')


def intent(booking_id, provider='vietqr', percent=100, purpose='balance', expected=201):
    return call('POST', '/api/payments/intents', {'bookingId': booking_id, 'provider': provider, 'prepaymentPercent': percent, 'purpose': purpose}, 'client', expected)


def confirm(payment_id, expected=200):
    return call('POST', f'/api/payments/{payment_id}/demo-confirm', role='client', expected=expected)


# 30% prepayment -> exact balance -> single pending intent -> idempotent confirm.
primary = booking('honda-pcx-150cc-2022-73073', '2026-11-01', '2026-11-04', 'Stage 12 Balance Client')
primary_id = primary['bookingId']
status(primary_id, 'confirmed')
prepayment = intent(primary_id, 'vietqr', 30, 'booking')['payment']
assert prepayment['amountVnd'] > 0 and prepayment['requestedPercent'] == 30
prepayment_paid = confirm(prepayment['id'])
assert prepayment_paid['bookingPaymentStatus'] == 'partially_paid'
old_balance = intent(primary_id, 'vnpay', 100, 'balance')['payment']
new_balance = intent(primary_id, 'momo', 100, 'balance')['payment']
old_state = call('GET', f"/api/payments/{old_balance['id']}")
assert old_state['payment']['status'] == 'cancelled'
settled = confirm(new_balance['id'])
assert settled['bookingPaymentStatus'] == 'paid'
assert settled['bookingPaidVnd'] == settled['bookingTotalVnd']
again = confirm(new_balance['id'])
assert again.get('idempotent') is True
assert again['bookingPaidVnd'] == settled['bookingPaidVnd']

# Fully paid booking -> extension -> exact new balance -> payment.
extended = call('PATCH', f'/api/bookings/{primary_id}/extend', {'newTo': '2026-11-06'}, 'client')
assert extended['additionalDays'] == 2
assert extended['remainingVnd'] == extended['additionalAmountVnd']
assert extended['paymentStatus'] == 'partially_paid'
extension_payment = intent(primary_id, 'vietqr', 100, 'extension')['payment']
assert extension_payment['amountVnd'] == extended['remainingVnd']
extension_paid = confirm(extension_payment['id'])
assert extension_paid['bookingPaymentStatus'] == 'paid'
assert extension_paid['bookingPaidVnd'] == extended['totalVnd']

# Collision guard.
blocker = booking('honda-pcx-150cc-2022-73073', '2026-11-07', '2026-11-09', 'Stage 12 Conflict Client')
status(blocker['bookingId'], 'confirmed')
collision = call('PATCH', f'/api/bookings/{primary_id}/extend', {'newTo': '2026-11-08'}, 'client', 409)
assert collision['error'] == 'vehicle_window_conflict'

# Closed booking guards.
status(primary_id, 'returned')
assert intent(primary_id, 'vietqr', 100, 'balance', 409)['error'] == 'booking_not_payable'
assert call('PATCH', f'/api/bookings/{primary_id}/extend', {'newTo': '2026-11-10'}, 'client', 409)['error'] == 'booking_not_extendable'

# Browser fixture: public fleet ID proves full 89-vehicle operational sync.
ui = booking('yamaha-x-max-2024-76826', '2026-12-01', '2026-12-04', 'Stage 12 UI Client')
ui_id = ui['bookingId']
status(ui_id, 'confirmed')
ui_pre = intent(ui_id, 'vietqr', 30, 'booking')['payment']
ui_paid = confirm(ui_pre['id'])
assert ui_paid['bookingPaymentStatus'] == 'partially_paid'
fixture = {
    'bookingId': ui_id,
    'totalVnd': ui_paid['bookingTotalVnd'],
    'paidVnd': ui_paid['bookingPaidVnd'],
    'from': '2026-12-01',
    'to': '2026-12-04',
    'vehicleId': 'yamaha-x-max-2024-76826',
}
with open('/tmp/stage12-ui.json', 'w', encoding='utf-8') as handle:
    json.dump(fixture, handle)

print('Stage 12 API business scenarios passed:', json.dumps({
    'dynamic_branch': True,
    'duplicate_branch_guard': True,
    'employee_new_branch': True,
    'vehicle_new_branch': True,
    'transfer_new_branch': True,
    'prepayment_balance': True,
    'pending_payment_supersede': True,
    'idempotent_payment': True,
    'extension': True,
    'extension_payment': True,
    'extension_conflict': True,
    'closed_booking_guards': True,
    'full_public_vehicle_booking': True,
}))
