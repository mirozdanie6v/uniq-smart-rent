import {autoSaleStateHash,domainRowsToLegacyState} from './ydb-domain-migration.mjs';

export async function readAutoSaleState({legacyStore,domainStore,mode='legacy',attempts=3,logger=console}){
  if(mode==='legacy')return{state:await legacyStore.loadState(),source:'legacy',fallback:false};
  let lastLegacy=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const before=await legacyStore.loadState();
      const metaBefore=await domainStore.migrationMeta();
      const rows=await domainStore.loadRows();
      const metaAfter=await domainStore.migrationMeta();
      const after=await legacyStore.loadState();
      lastLegacy=after;
      const revision=Number(after.revision)||0;
      const stable=Number(before.revision)===revision
        && Number(metaBefore?.sourceRevision)===revision
        && Number(metaAfter?.sourceRevision)===revision;
      if(!stable)continue;
      const normalized=domainRowsToLegacyState(rows,{revision,initialized:Boolean(after.initialized)});
      const parity=autoSaleStateHash(after)===autoSaleStateHash(normalized);
      if(!parity){
        logger.error?.('AUTO SALE normalized read parity mismatch',{revision});
        return{state:after,source:'legacy',fallback:true,reason:'parity_mismatch'};
      }
      if(mode==='shadow'){
        return{state:after,source:'legacy',fallback:false,shadowVerified:true};
      }
      return{state:normalized,source:'normalized',fallback:false,shadowVerified:true};
    }catch(error){
      logger.error?.('AUTO SALE normalized read failed',String(error?.message||error));
      break;
    }
  }
  return{state:lastLegacy||await legacyStore.loadState(),source:'legacy',fallback:true,reason:'unstable_or_error'};
}
