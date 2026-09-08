export type FinancePeriod = 'today' | '7d' | '30d' | 'all';
export type FinanceTransactionType = 'payment' | 'refund' | 'deposit_received' | 'deposit_returned' | 'cash_adjustment' | 'service_expense';

export interface FinanceBranch { id:string; name:string; address:string }
export interface FinanceTransaction {
  id:string;
  bookingId:string;
  paymentId:string;
  branchId:string;
  branchName:string;
  vehicleId:string;
  vehicleTitle:string;
  customerId:string;
  customerName:string;
  type:FinanceTransactionType;
  status:'pending'|'completed'|'failed'|'cancelled';
  amountVnd:number;
  method:string;
  occurredAt:string;
  note:string;
}
export interface FinanceSummary {
  grossPaymentsVnd:number;
  netRevenueVnd:number;
  onlineVnd:number;
  cashVnd:number;
  pendingPaymentsVnd:number;
  pendingPaymentsCount:number;
  depositsHeldVnd:number;
  depositsReceivedVnd:number;
  depositsReturnedVnd:number;
  refundsVnd:number;
  discountsVnd:number;
  serviceExpensesVnd:number;
}
export interface FinanceSnapshot {
  period:FinancePeriod;
  branchId:string;
  summary:FinanceSummary;
  transactions:FinanceTransaction[];
  branches:FinanceBranch[];
  demo:boolean;
  persisted:boolean;
}

const emptySummary: FinanceSummary = { grossPaymentsVnd:0,netRevenueVnd:0,onlineVnd:0,cashVnd:0,pendingPaymentsVnd:0,pendingPaymentsCount:0,depositsHeldVnd:0,depositsReceivedVnd:0,depositsReturnedVnd:0,refundsVnd:0,discountsVnd:0,serviceExpensesVnd:0 };

export async function fetchFinance(period:FinancePeriod,branchId='all'):Promise<FinanceSnapshot> {
  const response=await fetch(`/api/owner/finance?period=${encodeURIComponent(period)}&branch=${encodeURIComponent(branchId)}`,{headers:{accept:'application/json','x-uniq-demo-role':'owner'}});
  if(!response.ok) return {period,branchId,summary:emptySummary,transactions:[],branches:[],demo:true,persisted:false};
  return await response.json() as FinanceSnapshot;
}

export async function createDeposit(input:{action:'receive'|'return';amountVnd:number;branchId:string;method:'cash'|'bank_transfer'|'card';bookingId?:string;note?:string}) {
  const response=await fetch('/api/owner/finance/deposits',{method:'POST',headers:{'content-type':'application/json','x-uniq-demo-role':'owner'},body:JSON.stringify(input)});
  if(!response.ok) throw new Error((await response.json() as {error?:string}).error ?? 'deposit_failed');
  return await response.json() as {transaction:FinanceTransaction;persisted:boolean};
}

export async function createRefund(input:{sourceTransactionId:string;amountVnd:number;reason:string}) {
  const response=await fetch('/api/owner/finance/refunds',{method:'POST',headers:{'content-type':'application/json','x-uniq-demo-role':'owner'},body:JSON.stringify(input)});
  const data=await response.json() as {error?:string;remainingVnd?:number;refund?:{id:string;transactionId:string;amountVnd:number;remainingVnd:number};persisted?:boolean};
  if(!response.ok) {
    const error=new Error(data.error ?? 'refund_failed') as Error & {remainingVnd?:number};
    if(data.remainingVnd!==undefined) error.remainingVnd=data.remainingVnd;
    throw error;
  }
  return data;
}
