import test from 'node:test';
import assert from 'node:assert/strict';
import {syncYdbState} from '../server/ydb-sync.mjs';

function fakeStore(initial){
  let state=structuredClone(initial);
  return{
    async loadState(){return structuredClone(state)},
    async replaceState(next,{expectedRevision=null}={}){
      if(expectedRevision!==null&&Number(expectedRevision)!==Number(state.revision)){
        return{status:409,data:{error:'revision_conflict',currentRevision:state.revision,state:structuredClone(state)}};
      }
      state={...structuredClone(next),initialized:true,revision:Number(state.revision)+1};
      return{status:200,data:{ok:true,revision:state.revision}};
    }
  };
}

const base=()=>({
  revision:7,initialized:true,
  leads:[{id:'L-1',name:'Client',contact:'@client',model:'BMW X5',status:'Новый',nextAction:'2026-09-22',deposit:0}],
  quotes:[],orders:[],notes:{},team:[]
});

test('YDB sync rejects stale revisions',async()=>{
  const store=fakeStore(base());
  const input={...base(),baseRevision:6};
  const result=await syncYdbState(store,input);
  assert.equal(result.status,409);
  assert.equal(result.data.error,'revision_conflict');
});

test('YDB sync enforces lead transitions before write',async()=>{
  const store=fakeStore(base());
  const input=base();
  input.baseRevision=7;
  input.leads[0].status='Сделка';
  input.leads[0].deposit=1000;
  const result=await syncYdbState(store,input);
  assert.equal(result.status,400);
  assert.equal(result.data.error,'invalid_lead_transition');
});

test('YDB sync accepts a valid optimistic update',async()=>{
  const store=fakeStore(base());
  const input=base();
  input.baseRevision=7;
  input.leads[0].status='В работе';
  const result=await syncYdbState(store,input);
  assert.equal(result.status,200);
  assert.equal(result.data.revision,8);
  const stored=await store.loadState();
  assert.equal(stored.leads[0].status,'В работе');
});
