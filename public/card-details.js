(() => {
  'use strict';
  const activeRole = () => document.querySelector('.role-switch [data-role].active')?.dataset.role || '';
  function addDetailsActions() {
    if (activeRole() !== 'client') return;
    document.querySelectorAll('.vehicle-card[data-open]').forEach(card => {
      const body = card.querySelector('.vehicle-body');
      if (!body || body.querySelector('.model-details-link')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'model-details-link';
      button.textContent = 'Подробнее про модель →';
      const book = body.querySelector('[data-book]');
      body.insertBefore(button, book || null);
    });
  }
  function schedule() {
    addDetailsActions();
    requestAnimationFrame(addDetailsActions);
    setTimeout(addDetailsActions, 20);
  }
  const app = document.querySelector('#app');
  if (app) new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-go="catalog"],.fleet-count-link,[data-release-catalog]')) setTimeout(schedule,0);
  }, true);
  document.addEventListener('DOMContentLoaded', schedule);
  schedule();
})();