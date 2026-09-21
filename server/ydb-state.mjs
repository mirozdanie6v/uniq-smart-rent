import {Driver} from '@ydbjs/core';
import {query} from '@ydbjs/query';
import {MetadataCredentialsProvider} from '@ydbjs/auth/metadata';
import {Uint64} from '@ydbjs/value/primitive';

const EMPTY={initialized:false,leads:[],quotes:[],orders:[],notes:{},team:[]};
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
        team:Array.isArray(state.team)?state.team:[]
      };
      await tx`
        UPSERT INTO auto_sale_state (id, revision, payload, updated_at)
        VALUES (${STATE_ID}, ${new Uint64(BigInt(next))}, ${JSON.stringify(payload)}, ${new Date().toISOString()})
      `;
      return{status:200,data:{ok:true,revision:next}};
    });
  }

  async function ping(){
    await sql`SELECT 1 AS ok`;
    return true;
  }

  async function close(){
    driver.close();
  }

  return{loadState,replaceState,ping,close};
}
