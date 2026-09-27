import {Driver} from '@ydbjs/core';
import {query} from '@ydbjs/query';
import {MetadataCredentialsProvider} from '@ydbjs/auth/metadata';
import {Uint64} from '@ydbjs/value/primitive';

const EMPTY={initialized:false,leads:[],quotes:[],orders:[],notes:{},team:[],catalog:[]};
const STATE_ID=new Uint64(1n);

export async function createYdbStateStore({connectionString,credentialsProvider=new MetadataCredentialsProvider()}){
  const driver=new Driver(connectionString,{credentialsProvider});
  await driver.ready();
  const sql=query(driver);

  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_state (
      id Uint64 NOT NULL,
      revision Uint64 NOT NULL,
      payload Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_notification_outbox (
      id Utf8 NOT NULL,
      status Utf8 NOT NULL,
      payload Utf8 NOT NULL,
      attempts Uint64 NOT NULL,
      next_attempt_at Utf8 NOT NULL,
      created_at Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      last_error Utf8,
      message_id Utf8,
      PRIMARY KEY (id)
    )
  `;

  const [rows]=await sql`SELECT id FROM auto_sale_state WHERE id = ${STATE_ID}`;
  if(!rows.length){
    await sql`
      UPSERT INTO auto_sale_state (id, revision, payload, updated_at)
      VALUES (${STATE_ID}, ${new Uint64(0n)}, ${JSON.stringify(EMPTY)}, ${new Date().toISOString()})
    `;
  }

  async function loadState(){
    const [result]=await sql`
      SELECT revision, payload
      FROM auto_sale_state
      WHERE id = ${STATE_ID}
    `;
    const row=result[0];
    if(!row)return{revision:0,...EMPTY};
    let payload={...EMPTY};
    try{payload={...EMPTY,...JSON.parse(String(row.payload||'{}'))}}catch{}
    return{...payload,revision:Number(row.revision||0n),initialized:Boolean(payload.initialized||payload.leads?.length)};
  }

  async function replaceState(state,{expectedRevision=null}={}){
    return sql.begin({isolation:'serializableReadWrite',idempotent:true},async tx=>{
      const [rows]=await tx`
        SELECT revision
        FROM auto_sale_state
        WHERE id = ${STATE_ID}
      `;
      const current=Number(rows[0]?.revision||0n);
      if(expectedRevision!==null&&Number(expectedRevision)!==current){
        return{status:409,data:{error:'revision_conflict',currentRevision:current,state:await loadState()}};
      }
      const next=current+1;
      const payload={
        initialized:true,
        leads:Array.isArray(state.leads)?state.leads:[],
        quotes:Array.isArray(state.quotes)?state.quotes:[],
        orders:Array.isArray(state.orders)?state.orders:[],
        notes:state.notes&&typeof state.notes==='object'?state.notes:{},
        team:Array.isArray(state.team)?state.team:[],
        catalog:Array.isArray(state.catalog)?state.catalog:[]
      };
      await tx`
        UPSERT INTO auto_sale_state (id, revision, payload, updated_at)
        VALUES (${STATE_ID}, ${new Uint64(BigInt(next))}, ${JSON.stringify(payload)}, ${new Date().toISOString()})
      `;
      return{status:200,data:{ok:true,revision:next}};
    });
  }

  async function enqueueNotifications(items=[]){
    const now=new Date().toISOString(),created=[];
    for(const item of items){
      const id=String(item.id||'').trim();if(!id)continue;
      const [existing]=await sql`SELECT status FROM auto_sale_notification_outbox WHERE id = ${id}`;
      if(existing.length){created.push(id);continue}
      await sql`UPSERT INTO auto_sale_notification_outbox (id,status,payload,attempts,next_attempt_at,created_at,updated_at,last_error,message_id)
        VALUES (${id}, ${'pending'}, ${JSON.stringify(item)}, ${new Uint64(0n)}, ${now}, ${now}, ${now}, ${''}, ${''})`;
      created.push(id);
    }
    return created;
  }
  async function pendingNotifications(limit=50){
    const now=new Date().toISOString();
    const [rows]=await sql`SELECT id,status,payload,attempts,next_attempt_at,created_at,updated_at,last_error,message_id FROM auto_sale_notification_outbox
      WHERE (status = ${'pending'} OR status = ${'retry'}) AND next_attempt_at <= ${now} ORDER BY created_at LIMIT ${new Uint64(BigInt(limit))}`;
    return rows.map(row=>{let payload={};try{payload=JSON.parse(String(row.payload||'{}'))}catch{}return{id:String(row.id),status:String(row.status),attempts:Number(row.attempts||0n),...payload}});
  }
  async function markNotification(id,{ok,messageId='',error='',attempts=0}={}){
    const now=new Date(),current=Number(attempts)||0,nextAttempts=current+1,maxAttempts=8;
    const delay=Math.min(3600,Math.max(5,5*(2**Math.min(current,8))));
    const next=new Date(now.getTime()+delay*1000).toISOString();
    const status=ok?'sent':(nextAttempts>=maxAttempts?'dead':'retry');
    await sql`UPDATE auto_sale_notification_outbox SET status=${status}, attempts=${new Uint64(BigInt(nextAttempts))}, next_attempt_at=${ok?now.toISOString():next}, updated_at=${now.toISOString()}, last_error=${String(error||'')}, message_id=${String(messageId||'')} WHERE id=${String(id)}`;
  }
  async function notificationStats(){
    const [rows]=await sql`SELECT status, COUNT(*) AS count FROM auto_sale_notification_outbox GROUP BY status`;
    return Object.fromEntries(rows.map(row=>[String(row.status),Number(row.count||0n)]));
  }

  async function ping(){
    await sql`SELECT 1 AS ok`;
    return true;
  }

  async function close(){
    driver.close();
  }

  return{loadState,replaceState,enqueueNotifications,pendingNotifications,markNotification,notificationStats,ping,close};
}
