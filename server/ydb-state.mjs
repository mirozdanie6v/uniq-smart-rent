import {Driver} from '@ydbjs/core';
import {query} from '@ydbjs/query';
import {MetadataCredentialsProvider} from '@ydbjs/auth/metadata';
import {Uint64} from '@ydbjs/value/primitive';
import {ensureAutoSaleDomainSchema} from './ydb-domain-store.mjs';
import {applyDomainDiff,buildDomainDiff,replaceDomainSnapshotInTransaction,summarizeDomainDiff} from './ydb-domain-dual-write.mjs';

const EMPTY={initialized:false,leads:[],quotes:[],orders:[],notes:{},team:[],catalog:[]};
const STATE_ID=new Uint64(1n);

export async function createYdbStateStore({connectionString,credentialsProvider=new MetadataCredentialsProvider(),domainDualWrite=/^(1|true|yes)$/i.test(String(process.env.AUTO_SALE_YDB_DUAL_WRITE||''))}){
  const driver=new Driver(connectionString,{credentialsProvider});
  await driver.ready();
  const sql=query(driver);
  const READ_ATTEMPTS=3;
  const READ_TIMEOUT_MS=7000;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const decodeStateRow=row=>{
    if(!row)return{revision:0,...EMPTY};
    let payload={...EMPTY};
    try{payload={...EMPTY,...JSON.parse(String(row.payload||'{}'))}}catch{}
    return{...payload,revision:Number(row.revision||0n),initialized:Boolean(payload.initialized||payload.leads?.length)};
  };
  async function readQuery(makeQuery,label='read'){
    let lastError=null;
    for(let attempt=1;attempt<=READ_ATTEMPTS;attempt++){
      try{
        return await makeQuery()
          .isolation('onlineReadOnly',{allowInconsistentReads:false})
          .idempotent(true)
          .timeout(READ_TIMEOUT_MS);
      }catch(error){
        lastError=error;
        if(attempt>=READ_ATTEMPTS)throw error;
        console.warn(`AUTO SALE YDB ${label} retry ${attempt}/${READ_ATTEMPTS}`,String(error?.message||error));
        await sleep(150*(2**(attempt-1)));
      }
    }
    throw lastError;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS auto_sale_state (
      id Uint64 NOT NULL,
      revision Uint64 NOT NULL,
      payload Utf8 NOT NULL,
      updated_at Utf8 NOT NULL,
      PRIMARY KEY (id)
    )
  `;
  await ensureAutoSaleDomainSchema(sql);
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

  const [rows]=await readQuery(()=>sql`SELECT id FROM auto_sale_state WHERE id = ${STATE_ID}`,'state-init');
  if(!rows.length){
    await sql`
      UPSERT INTO auto_sale_state (id, revision, payload, updated_at)
      VALUES (${STATE_ID}, ${new Uint64(0n)}, ${JSON.stringify(EMPTY)}, ${new Date().toISOString()})
    `;
  }

  async function loadState(){
    const [result]=await readQuery(()=>sql`
      SELECT revision, payload
      FROM auto_sale_state
      WHERE id = ${STATE_ID}
    `,'state-load');
    return decodeStateRow(result[0]);
  }

  async function replaceState(state,{expectedRevision=null,notifications=[]}={}){
    return sql.begin({isolation:'serializableReadWrite',idempotent:true},async tx=>{
      const [rows]=await tx`
        SELECT revision, payload
        FROM auto_sale_state
        WHERE id = ${STATE_ID}
      `;
      const current=Number(rows[0]?.revision||0n);
      if(expectedRevision!==null&&Number(expectedRevision)!==current){
        return{status:409,data:{error:'revision_conflict',currentRevision:current,state:decodeStateRow(rows[0])}};
      }
      const next=current+1;
      const previous=decodeStateRow(rows[0]);
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
      let domainDiff=null;
      let domainCatchup=null;
      if(domainDualWrite){
        const [metaRows]=await tx`
          SELECT source_revision
          FROM auto_sale_state_meta
          WHERE id = ${STATE_ID}
        `;
        const shadowRevision=Number(metaRows[0]?.source_revision||0n);
        if(shadowRevision!==current){
          domainCatchup=await replaceDomainSnapshotInTransaction(tx,previous,{compatRevision:current,status:'dual-write-catchup'});
        }
        domainDiff=buildDomainDiff(previous,{...payload,revision:next});
        await applyDomainDiff(tx,domainDiff,{compatRevision:next,status:'dual-write'});
      }
      const now=new Date().toISOString();
      for(const item of notifications){
        await tx`UPSERT INTO auto_sale_notification_outbox (id,status,payload,attempts,next_attempt_at,created_at,updated_at,last_error,message_id)
          VALUES (${item.id}, ${'pending'}, ${JSON.stringify(item)}, ${new Uint64(0n)}, ${now}, ${now}, ${now}, ${''}, ${''})`;
      }
      return{status:200,data:{ok:true,revision:next,...(domainDualWrite?{domainDualWrite:{enabled:true,catchup:domainCatchup,diff:summarizeDomainDiff(domainDiff)}}:{})}};
    });
  }

  async function enqueueNotifications(items=[]){
    const now=new Date().toISOString(),created=[];
    for(const item of items){
      const id=String(item.id||'').trim();if(!id)continue;
      const [existing]=await readQuery(()=>sql`SELECT status FROM auto_sale_notification_outbox WHERE id = ${id}`,'notification-exists');
      if(existing.length){created.push(id);continue}
      await sql`UPSERT INTO auto_sale_notification_outbox (id,status,payload,attempts,next_attempt_at,created_at,updated_at,last_error,message_id)
        VALUES (${id}, ${'pending'}, ${JSON.stringify(item)}, ${new Uint64(0n)}, ${now}, ${now}, ${now}, ${''}, ${''})`;
      created.push(id);
    }
    return created;
  }
  async function pendingNotifications(limit=50){
    const now=new Date().toISOString();
    return sql.begin({isolation:'serializableReadWrite',idempotent:true},async tx=>{
      const [rows]=await tx`SELECT id,status,payload,attempts,next_attempt_at,created_at,updated_at,last_error,message_id FROM auto_sale_notification_outbox
        WHERE (status = ${'pending'} OR status = ${'retry'} OR status = ${'processing'}) AND next_attempt_at <= ${now} ORDER BY created_at, id LIMIT ${new Uint64(BigInt(limit))}`;
      const lease=new Date(Date.now()+120_000).toISOString();
      for(const row of rows)await tx`UPDATE auto_sale_notification_outbox SET status=${'processing'},next_attempt_at=${lease} WHERE id=${String(row.id)}`;
      return rows.map(row=>{let payload={};try{payload=JSON.parse(String(row.payload||'{}'))}catch{}return{...payload,id:String(row.id),status:String(row.status),attempts:Number(row.attempts||0n)}});
    });
  }
  async function pendingNotificationsByIds(ids=[]){
    const wanted=[...new Set(ids.map(id=>String(id||'').trim()).filter(Boolean))].slice(0,50);
    if(!wanted.length)return[];
    const now=new Date().toISOString();
    return sql.begin({isolation:'serializableReadWrite',idempotent:true},async tx=>{
      const rows=[];
      for(const id of wanted){
        const [found]=await tx`SELECT id,status,payload,attempts,next_attempt_at,created_at,updated_at,last_error,message_id FROM auto_sale_notification_outbox
          WHERE id=${id} AND (status = ${'pending'} OR status = ${'retry'} OR status = ${'processing'}) AND next_attempt_at <= ${now}`;
        if(found[0])rows.push(found[0]);
      }
      const lease=new Date(Date.now()+120_000).toISOString();
      for(const row of rows)await tx`UPDATE auto_sale_notification_outbox SET status=${'processing'},next_attempt_at=${lease} WHERE id=${String(row.id)}`;
      return rows.map(row=>{let payload={};try{payload=JSON.parse(String(row.payload||'{}'))}catch{}return{...payload,id:String(row.id),status:String(row.status),attempts:Number(row.attempts||0n)}});
    });
  }
  async function markNotification(id,{ok,messageId='',error='',attempts=0}={}){
    const now=new Date(),current=Number(attempts)||0,nextAttempts=current+1,maxAttempts=8;
    const delay=Math.min(3600,Math.max(5,5*(2**Math.min(current,8))));
    const next=new Date(now.getTime()+delay*1000).toISOString();
    const status=ok?'sent':(nextAttempts>=maxAttempts?'dead':'retry');
    await sql`UPDATE auto_sale_notification_outbox SET status=${status}, attempts=${new Uint64(BigInt(nextAttempts))}, next_attempt_at=${ok?now.toISOString():next}, updated_at=${now.toISOString()}, last_error=${String(error||'')}, message_id=${String(messageId||'')} WHERE id=${String(id)}`;
  }
  async function notificationStats(){
    const [rows]=await readQuery(()=>sql`SELECT status, COUNT(*) AS count FROM auto_sale_notification_outbox GROUP BY status`,'notification-stats');
    return Object.fromEntries(rows.map(row=>[String(row.status),Number(row.count||0n)]));
  }
  async function notificationStatus(ids=[]){
    const results=[];
    for(const id of ids){
      const [rows]=await readQuery(()=>sql`SELECT id,status,payload,message_id,last_error,attempts FROM auto_sale_notification_outbox WHERE id=${String(id)}`,'notification-status');
      for(const row of rows){const item=JSON.parse(String(row.payload));results.push({id:String(row.id),status:String(row.status),event:item.event,target:item.target,leadId:item.leadId,messageId:String(row.message_id||''),error:String(row.last_error||''),attempts:Number(row.attempts||0n)})}
    }
    return results;
  }

  async function ping(){
    await readQuery(()=>sql`SELECT 1 AS ok`,'ping');
    return true;
  }

  async function close(){
    driver.close();
  }

  return{loadState,replaceState,enqueueNotifications,pendingNotifications,pendingNotificationsByIds,markNotification,notificationStats,notificationStatus,ping,close,domainDualWriteEnabled:domainDualWrite};
}
