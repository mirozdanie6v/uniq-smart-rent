(() => {
  'use strict';

  const OPTIONS = [
    ['ru', 'RU'],
    ['vi', 'VI'],
    ['en', 'EN'],
    ['ko', 'KO'],
    ['zh', '中文']
  ];

  function sourceSelect() {
    return document.querySelector('#uniqLanguageSelect');
  }

  function mount() {
    const topbar = document.querySelector('.topbar');
    const source = sourceSelect();
    if (!topbar || !source) return;

    let wrap = topbar.querySelector('.header-language-switcher');
    if (!wrap) {
      wrap = document.createElement('label');
      wrap.className = 'header-language-switcher';
      wrap.setAttribute('aria-label', 'Язык интерфейса');
      wrap.innerHTML = `<span aria-hidden="true">文</span><select aria-label="Язык интерфейса">${OPTIONS.map(([value,label]) => `<option value="${value}">${label}</option>`).join('')}</select>`;
      topbar.append(wrap);

      const select = wrap.querySelector('select');
      select.addEventListener('change', () => {
        const original = sourceSelect();
        if (!original) return;
        original.value = select.value;
        original.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    const proxy = wrap.querySelector('select');
    if (proxy && proxy.value !== source.value) proxy.value = source.value;
  }

  function init() {
    mount();
    const observer = new MutationObserver(() => mount());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('change', event => {
      if (event.target?.id === 'uniqLanguageSelect') mount();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
