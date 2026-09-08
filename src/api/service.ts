export type ServiceStatus='scheduled'|'in_progress'|'completed'|'cancelled';
export type ServiceType='maintenance'|'repair'|'inspection'|'cleaning'|'other';
export interface ServiceRecordDto{ id:string;vehicleId:string;vehicleTitle:string;branchId:string;branchName:string;status:ServiceStatus;serviceType:ServiceType;mileageKm:number;costVnd:number;startedAt:string;completedAt:string;nextServiceAt:string;nextServiceMileageKm:number;note:string;supplier:string;inspectionJson:string;persisted:boolean }
export interface ServiceSnapshot{records:ServiceRecordDto[];summary:{inService:number;scheduled:number;completed30d:number;cost30dVnd:number;dueSoon:number};persisted:boolean}
const localKey='uniq-stage9-service-v1';
const readLocal=():ServiceRecordDto[]=>{try{return JSON.parse(sessionStorage.getItem(localKey)||'[]') as ServiceRecordDto[]}catch{return[]}};
const writeLocal=(rows:ServiceRecordDto[])=>{try{sessionStorage.setItem(localKey,JSON.stringify(rows))}catch{}};
export async function fetchService():Promise<ServiceSnapshot>{
  try{const r=await fetch('/api/owner/service',{headers:{accept:'application/json','x-uniq-demo-role':'owner'}});if(!r.ok)throw new Error();const remote=await r.json() as ServiceSnapshot;const merged=new Map(remote.records.map(x=>[x.id,x]));for(const x of readLocal())merged.set(x.id,x);return{...remote,records:[...merged.values()]};}catch{return{records:readLocal(),summary:{inService:0,scheduled:0,completed30d:0,cost30dVnd:0,dueSoon:0},persisted:false}}
}
export async function createService(input:Omit<ServiceRecordDto,'id'|'vehicleTitle'|'branchName'|'completedAt'|'persisted'>):Promise<ServiceRecordDto>{
  const local:ServiceRecordDto={...input,id:`service-${crypto.randomUUID()}`,vehicleTitle:input.vehicleId,branchName:input.branchId,completedAt:'',persisted:false};
  try{const r=await fetch('/api/owner/service',{method:'POST',headers:{'content-type':'application/json','x-uniq-demo-role':'owner'},body:JSON.stringify({...input,id:local.id})});if(!r.ok)throw new Error();const data=await r.json() as {record:ServiceRecordDto};return data.record;}catch{const rows=[local,...readLocal()];writeLocal(rows);return local;}
}
export async function updateServiceStatus(record:ServiceRecordDto,status:ServiceStatus):Promise<ServiceRecordDto>{
  try{const r=await fetch(`/api/owner/service/${encodeURIComponent(record.id)}`,{method:'PATCH',headers:{'content-type':'application/json','x-uniq-demo-role':'owner'},body:JSON.stringify({status})});if(!r.ok)throw new Error();const data=await r.json() as {record:ServiceRecordDto};return data.record;}catch{const next={...record,status,completedAt:status==='completed'?new Date().toISOString():record.completedAt};writeLocal(readLocal().map(x=>x.id===record.id?next:x));return next;}
}
