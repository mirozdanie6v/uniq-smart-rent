import type { PaymentProvider } from '../../api/payments';

const meta: Record<PaymentProvider,{short:string;sub?:string;className:string}> = {
  vietqr:{short:'VietQR',className:'vietqr'},
  vnpay:{short:'VNPAY',className:'vnpay'},
  momo:{short:'MoMo',className:'momo'},
  zalopay:{short:'ZaloPay',className:'zalopay'},
  sbp:{short:'СБП',sub:'QR',className:'sbp'},
  yookassa:{short:'ЮKassa',className:'yookassa'},
  tbank:{short:'T',sub:'Bank',className:'tbank'},
};

export function ProviderLogo({provider}:{provider:PaymentProvider}) {
  const item=meta[provider];
  return <span className={`provider-logo provider-logo-${item.className}`} aria-hidden="true">
    <span className="provider-logo-main">{item.short}</span>{item.sub ? <span className="provider-logo-sub">{item.sub}</span> : null}
  </span>;
}
