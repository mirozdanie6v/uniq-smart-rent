(() => {
  'use strict';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scroll-top';
  button.setAttribute('aria-label', 'Наверх');
  button.setAttribute('title', 'Наверх');
  button.textContent = '↑';
  document.body.appendChild(button);

  const syncVisibility = () => {
    button.classList.toggle('is-visible', window.scrollY > 360);
  };

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', syncVisibility, { passive: true });
  window.addEventListener('pageshow', syncVisibility);
  syncVisibility();
})();
