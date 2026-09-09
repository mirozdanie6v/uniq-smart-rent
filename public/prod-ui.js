(() => {
  'use strict';

  const LANG_KEY = 'uniq-language-v1';
  const SUPPORTED = ['ru','vi','en','ko','zh'];
  const copy = {
    slogan: {
      ru: 'Аренда байков и авто в Нячанге — за пару минут.',
      vi: 'Thuê xe máy và ô tô tại Nha Trang — chỉ trong vài phút.',
      en: 'Rent bikes and cars in Nha Trang — in just a few minutes.',
      ko: '나트랑 오토바이·자동차 렌트 — 몇 분이면 완료.',
      zh: '芽庄摩托车和汽车租赁——几分钟即可完成。'
    },
    subline: {
      ru: 'Выберите технику и даты, отправьте заявку — менеджер UNIQ подтвердит наличие и условия аренды.',
      vi: 'Chọn xe và ngày thuê, gửi yêu cầu — quản lý UNIQ sẽ xác nhận tình trạng xe và điều kiện thuê.',
      en: 'Choose a vehicle and dates, send a request — the UNIQ manager will confirm availability and rental terms.',
      ko: '차량과 날짜를 선택해 요청을 보내면 UNIQ 매니저가 이용 가능 여부와 대여 조건을 확인합니다.',
      zh: '选择车辆和日期并提交申请，UNIQ 经理将确认车辆可用情况和租赁条件。'
    },
    swipe: {
      ru: 'Листайте →', vi: 'Vuốt để xem →', en: 'Swipe to browse →', ko: '옆으로 넘겨보세요 →', zh: '滑动查看更多 →'
    },
    clients: {
      ru: 'Клиенты', vi: 'Khách hàng', en: 'Clients', ko: '고객', zh: '客户'
    },
    latestClients: {
      ru: 'Последние клиенты', vi: 'Khách hàng gần đây', en: 'Recent clients', ko: '최근 고객', zh: '最近客户'
    },
    ownerSummary: {
      ru: 'Ключевые показатели по парку, клиентам и заявкам в одном экране.',
      vi: 'Các chỉ số chính về đội xe, khách hàng và yêu cầu trên một màn hình.',
      en: 'Key fleet, client and request metrics on one screen.',
      ko: '차량, 고객, 요청의 핵심 지표를 한 화면에서 확인하세요.',
      zh: '在一个屏幕查看车队、客户和申请的关键指标。'
    },
    day: { ru: 'день', vi: 'ngày', en: 'day', ko: '일', zh: '天' },
    types: {
      ru: {car:'Авто',scooter:'Скутер',motorcycle:'Мотоцикл'},
      vi: {car:'Ô tô',scooter:'Xe tay ga',motorcycle:'Xe mô tô'},
      en: {car:'Car',scooter:'Scooter',motorcycle:'Motorcycle'},
      ko: {car:'자동차',scooter:'스쿠터',motorcycle:'모터사이클'},
      zh: {car:'汽车',scooter:'踏板车',motorcycle:'摩托车'}
    }
  };

  const lang = () => {
    const value = localStorage.getItem(LANG_KEY) || 'ru';
    return SUPPORTED.includes(value) ? value : 'ru';
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = value => Number(value) > 0 ? new Intl.NumberFormat('ru-RU').format(Number(value)) + ' ₫' : '—';
  const fleet = () => Array.isArray(window.UNIQ_FLEET) ? window.UNIQ_FLEET : [];
  const activeRole = () => document.querySelector('.role-switch [data-role].active')?.dataset.role || '';

  function pickFeatured() {
    const source = fleet().filter(v => Array.isArray(v.photos) && v.photos.length);
    const preferred = /x-?max|nmax|nvx|rebel|pcx|vision|adv-?350|sh\b/i;
    const ranked = [...source].sort((a,b) => Number(preferred.test(b.title || '')) - Number(preferred.test(a.title || '')));
    const result = [];
    const types = new Set();
    for (const vehicle of ranked) {
      if (result.length >= 7) break;
      if (result.length < 3 && types.has(vehicle.type)) continue;
      result.push(vehicle); types.add(vehicle.type);
    }
    for (const vehicle of ranked) if (result.length < 7 && !result.includes(vehicle)) result.push(vehicle);
    return result.slice(0,7);
  }

  function featuredCard(vehicle, currentLang) {
    const photo = vehicle.photos?.[0] || '';
    const type = copy.types[currentLang]?.[vehicle.type] || vehicle.type || '';
    return `<article class="featured-card" data-featured-id="${esc(vehicle.id)}" tabindex="0" role="button" aria-label="${esc(vehicle.title)}">
      <div class="featured-media">${photo ? `<img src="${esc(photo)}" alt="${esc(vehicle.title)}" loading="lazy" decoding="async">` : ''}<span>${esc(type)}</span></div>
      <div class="featured-copy"><b>${esc(vehicle.title)}</b><small>${money(vehicle.dailyVnd)} / ${copy.day[currentLang]}</small></div>
    </article>`;
  }

  function openFeatured(id) {
    const catalogButton = document.querySelector('.bottom-nav [data-go="catalog"], [data-go="catalog"]');
    catalogButton?.click();
    setTimeout(() => document.querySelector(`[data-open="${CSS.escape(id)}"]`)?.click(), 40);
  }

  function openCatalog() {
    document.querySelector('.bottom-nav [data-go="catalog"]')?.click();
  }

  function buildLocations() {
    const existing = document.querySelector('.home-locations');
    if (existing) return existing;
    const section = document.createElement('section');
    section.className = 'section home-locations';
    section.innerHTML = `<div class="section-head"><div><span class="eyebrow">UNIQ MOTO · NHA TRANG</span><h2>Контакты и выдача.</h2></div></div>
      <div class="home-office-grid">
        <a class="home-office-card" href="https://maps.app.goo.gl/qr3FNiVVxAdThVBV6" target="_blank" rel="noreferrer" aria-label="UNIQ Moto, 312 Đ. 2/4 — открыть в Google Maps">
          <iframe title="UNIQ Moto — 312 Đ. 2/4" src="https://www.google.com/maps?q=UNIQ%20Moto%20312%20%C4%90.%202%2F4%20Nha%20Trang&output=embed" loading="lazy" tabindex="-1"></iframe>
          <span><b>312 Đ. 2/4</b><small>Северный филиал · Google Maps ↗</small></span>
        </a>
        <a class="home-office-card" href="https://maps.app.goo.gl/sJdMndLRPz9b228J7" target="_blank" rel="noreferrer" aria-label="UNIQ Moto, 254 Nguyễn Thị Minh Khai — открыть в Google Maps">
          <iframe title="UNIQ Moto — 254 Nguyễn Thị Minh Khai" src="https://www.google.com/maps?q=UNIQ%20Moto%20254%20Nguyen%20Thi%20Minh%20Khai%20Nha%20Trang&output=embed" loading="lazy" tabindex="-1"></iframe>
          <span><b>254 Nguyễn Thị Minh Khai</b><small>Центр города · Google Maps ↗</small></span>
        </a>
      </div>`;
    return section;
  }

  function polishClient(force = false) {
    const main = document.querySelector('main');
    const hero = main?.querySelector('.hero');
    const quick = main?.querySelector('.quick');
    if (!main || !hero || !quick || activeRole() !== 'client') return;
    const currentLang = lang();
    if (!force && main.dataset.prodClient === currentLang) return;

    const intro = hero.firstElementChild;
    if (intro) {
      intro.innerHTML = `<span class="eyebrow">UNIQ SMART RENT · NHA TRANG</span><h1>${esc(copy.slogan[currentLang])}</h1><p>${esc(copy.subline[currentLang])}</p>`;
    }

    const featured = pickFeatured();
    let showcase = hero.querySelector('.hero-card');
    if (!showcase) { showcase = document.createElement('div'); hero.append(showcase); }
    showcase.className = 'hero-card hero-fleet-card';
    showcase.innerHTML = `<div class="showcase-head"><button type="button" class="fleet-count-link" data-release-catalog aria-label="Открыть каталог — ${fleet().length} единиц техники"><b>${fleet().length}</b><span>единиц техники</span></button><div class="slide-controls"><button type="button" data-slide="prev" aria-label="Previous">←</button><button type="button" data-slide="next" aria-label="Next">→</button></div></div>
      <div class="showcase-title"><div><span class="eyebrow">ПАРК</span><strong>Популярная техника</strong></div><span class="swipe-hint">${esc(copy.swipe[currentLang])}</span></div>
      <div class="featured-slider-wrap"><div class="featured-slider">${featured.map(v=>featuredCard(v,currentLang)).join('')}</div></div>
      <button class="text showcase-catalog" data-go="catalog" type="button">Весь каталог →</button>`;

    const oldPopular = [...main.querySelectorAll('.section')].find(section => section !== showcase && section.querySelector('h2')?.textContent?.trim() === 'Популярная техника');
    oldPopular?.remove();

    const proof = main.querySelector('.proof');
    const locations = buildLocations();
    if (!locations.isConnected) main.append(locations);
    else main.append(locations);
    if (proof && proof.nextElementSibling !== locations) main.insertBefore(locations, null);

    showcase.querySelectorAll('[data-featured-id]').forEach(card => {
      const open = () => openFeatured(card.dataset.featuredId || '');
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
    const slider = showcase.querySelector('.featured-slider');
    showcase.querySelector('[data-slide="next"]')?.addEventListener('click', () => slider?.scrollBy({left: Math.max(240, slider.clientWidth * .78), behavior:'smooth'}));
    showcase.querySelector('[data-slide="prev"]')?.addEventListener('click', () => slider?.scrollBy({left: -Math.max(240, slider.clientWidth * .78), behavior:'smooth'}));
    showcase.querySelector('.showcase-catalog')?.addEventListener('click', openCatalog);
    showcase.querySelector('.fleet-count-link')?.addEventListener('click', openCatalog);

    main.dataset.prodClient = currentLang;
  }

  function ownerClientsSection() {
    const main = document.querySelector('main');
    if (!main) return null;
    const known = new Set(Object.values(copy.latestClients));
    return [...main.querySelectorAll('.section')].find(section => known.has(section.querySelector('h2')?.textContent?.trim()) || section.querySelector('h2')?.textContent?.trim() === 'Последние клиенты') || null;
  }

  function localizeOwner(main, currentLang) {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue?.trim();
      if (!text) continue;
      if (text === 'Клиенты') node.nodeValue = node.nodeValue.replace('Клиенты', copy.clients[currentLang]);
      if (text === 'Последние клиенты') node.nodeValue = node.nodeValue.replace('Последние клиенты', copy.latestClients[currentLang]);
      if (text === 'Ключевые показатели по парку, клиентам и заявкам в одном экране.') node.nodeValue = node.nodeValue.replace(text, copy.ownerSummary[currentLang]);
    }
  }

  function scrollOwnerClients() {
    const overview = document.querySelector('.bottom-nav [data-go="overview"]');
    if (overview && !overview.classList.contains('active')) overview.click();
    setTimeout(() => {
      polishOwner(true);
      const target = ownerClientsSection();
      target?.scrollIntoView({behavior:'smooth',block:'start'});
      document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.remove('active'));
      document.querySelector('.bottom-nav [data-owner-custom="clients"]')?.classList.add('active');
    }, 45);
  }

  function polishOwner(force = false) {
    if (activeRole() !== 'owner') return;
    const main = document.querySelector('main');
    const nav = document.querySelector('.bottom-nav');
    if (!main || !nav) return;
    const currentLang = lang();
    if (!force && main.dataset.prodOwner === currentLang && nav.querySelector('[data-owner-custom="clients"]')) return;

    localizeOwner(main,currentLang);
    const section = ownerClientsSection();
    if (section) section.dataset.ownerClientsSection = 'true';

    let clients = nav.querySelector('[data-owner-custom="clients"]');
    if (!clients) {
      clients = document.createElement('button');
      clients.type = 'button';
      clients.dataset.ownerCustom = 'clients';
      clients.innerHTML = `<span>●</span><b>${esc(copy.clients[currentLang])}</b>`;
      clients.addEventListener('click', scrollOwnerClients);
      const fleetButton = nav.querySelector('[data-go="fleet"]');
      nav.insertBefore(clients, fleetButton || null);
    } else {
      clients.querySelector('b').textContent = copy.clients[currentLang];
    }
    nav.classList.add('owner-nav');
    main.dataset.prodOwner = currentLang;
  }

  let applying = false;
  function refresh(force = false) {
    if (applying) return;
    applying = true;
    try {
      if (activeRole() === 'client') polishClient(force);
      if (activeRole() === 'owner') polishOwner(force);
    } finally { applying = false; }
  }

  const observer = new MutationObserver(() => queueMicrotask(() => refresh(false)));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('change', event => {
    if (event.target?.id === 'uniqLanguageSelect') setTimeout(() => refresh(true), 25);
  }, true);
  refresh(true);
})();