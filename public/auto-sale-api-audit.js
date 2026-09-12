(()=>{
  const params=new URLSearchParams(location.search);
  if(!params.has('layoutAudit'))return;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const finish=failures=>{
    const node=document.createElement('pre');
    node.id='api-audit-result';
    node.style.display='none';
    node.textContent=failures.length?`API_AUDIT_FAIL::${encodeURIComponent(failures.join('|'))}`:'API_AUDIT_OK';
    document.body.append(node);
    document.body.dataset.apiAudit=failures.length?'fail':'ok';
    document.body.dataset.apiAuditDetails=failures.join('|');
  };
  window.addEventListener('load',async()=>{
    const failures=[];
    try{
      const healthResponse=await fetch('/api/health',{cache:'no-store'});
      const health=await healthResponse.json();
      if(!healthResponse.ok||health.service!=='auto-sale-usa'||health.d1!==true||Number(health.schemaVersion)!==9||health.demoMode!==true||health.demoCardsPersistent!==true||health.teamManagement!==true)failures.push('api-health');
    }catch{failures.push('api-health-unavailable')}
    try{
      await wait(350);
      const stateResponse=await fetch('/api/auto-sale/state',{cache:'no-store'});
      const state=await stateResponse.json();
      if(!stateResponse.ok||state.initialized!==true||Number(state.revision)<1||!Array.isArray(state.leads)||state.leads.length<1||!Array.isArray(state.quotes)||state.quotes.length<1||!Array.isArray(state.orders)||state.orders.length<1||!Array.isArray(state.team)||state.team.length<3)failures.push('d1-state');
      const demoLeads=Array.isArray(state.leads)?state.leads.filter(x=>String(x?.id||'').startsWith('L-DEMO-')):[];
      const demoQuotes=Array.isArray(state.quotes)?state.quotes.filter(x=>String(x?.id||'').startsWith('Q-DEMO-')):[];
      const demoOrders=Array.isArray(state.orders)?state.orders.filter(x=>String(x?.id||'').startsWith('O-DEMO-')):[];
      if(demoLeads.length<2)failures.push('demo-leads-missing');
      if(demoQuotes.length<2)failures.push('demo-quotes-missing');
      if(!demoOrders.some(x=>x.stage==='Доставка'))failures.push('demo-delivery-missing');
      if(!demoOrders.some(x=>x.stage==='Выдача'))failures.push('demo-handoff-missing');
      if(!demoOrders.every(x=>Array.isArray(x.payments)&&x.payments.length>0))failures.push('demo-payments-missing');
    }catch{failures.push('d1-state-unavailable')}
    finish(failures);
  });
})();