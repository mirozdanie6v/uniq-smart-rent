from pathlib import Path

path=Path('src/features/prototype/PrototypeApp.tsx')
text=path.read_text(encoding='utf-8')
old="setRequests((current) => current.map((item) => item.id === request.id ? { ...item, to:newTo, estimate:item.estimate + previewAdditional, paymentStatus:item.paidVnd && item.paidVnd > 0 ? 'partially_paid' : item.paymentStatus } : item));"
new="setRequests((current) => current.map((item) => item.id === request.id ? { ...item, to:newTo, estimate:item.estimate + previewAdditional, ...(item.paidVnd && item.paidVnd > 0 ? { paymentStatus:'partially_paid' as const } : {}) } : item));"
if old in text:
    path.write_text(text.replace(old,new,1),encoding='utf-8')
elif new not in text:
    raise SystemExit('Stage 12 postfix anchor missing')
print('Stage 12 strict typing postfix applied')
