(() => {
  'use strict';

  const LANG_KEY = 'uniq-language-v1';
  const SUPPORTED = ['ru','vi','en','ko','zh'];
  const INDEX = { vi:0, en:1, ko:2, zh:3 };
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();

  async function loadDictionary() {
    const source = await fetch('/i18n-current.js', { cache:'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`i18n-current:${response.status}`);
      return response.text();
    });
    const marker = '  const T = {';
    const start = source.indexOf(marker);
    const end = source.indexOf('\n  };\n\n  function currentLanguage', start + marker.length);
    if (start < 0 || end < 0) throw new Error('i18n-current:dictionary-not-found');
    const body = source.slice(start + marker.length, end);
    return Function(`"use strict"; return ({${body}\n});`)();
  }

  function currentLanguage() {
    const stored = localStorage.getItem(LANG_KEY);
    return SUPPORTED.includes(stored) ? stored : 'ru';
  }

  function makeRuntime(T) {
    const sourceByTarget = new Map();
    Object.entries(T).forEach(([ru,row]) => {
      sourceByTarget.set(ru, ru);
      row.forEach((translated) => sourceByTarget.set(translated, ru));
    });

    function directFromSource(source, lang) {
      if (lang === 'ru') return source;
      const row = T[source];
      return row ? row[INDEX[lang]] : null;
    }

    function pattern(source, lang) {
      if (lang === 'ru') return source;
      const i = INDEX[lang];
      let m;
      m = source.match(/^(\d+)\s+клиентов$/);
      if (m) return [`${m[1]} khách hàng`,`${m[1]} customers`,`${m[1]}명 고객`,`${m[1]} 位客户`][i];
      m = source.match(/^(\d+)\s+операций$/);
      if (m) return [`${m[1]} giao dịch`,`${m[1]} transactions`,`${m[1]}건 거래`,`${m[1]} 笔交易`][i];
      m = source.match(/^(\d+)\s+единиц$/);
      if (m) return [`${m[1]} xe`,`${m[1]} vehicles`,`${m[1]}대`,`${m[1]} 辆`][i];
      m = source.match(/^(\d+)\s+(?:аренда|аренд)$/);
      if (m) return [`${m[1]} lượt thuê`,`${m[1]} rentals`,`${m[1]}건 대여`,`${m[1]} 次租赁`][i];
      m = source.match(/^(\d+)\s+заявок$/);
      if (m) return [`${m[1]} yêu cầu`,`${m[1]} requests`,`${m[1]}건 요청`,`${m[1]} 个申请`][i];
      m = source.match(/^(\d+)\s+платежей$/);
      if (m) return [`${m[1]} khoản thanh toán`,`${m[1]} payments`,`${m[1]}건 결제`,`${m[1]} 笔付款`][i];
      m = source.match(/^(\d+)\s+активных аренд$/);
      if (m) return [`${m[1]} lượt thuê đang hoạt động`,`${m[1]} active rentals`,`${m[1]}건 대여 중`,`${m[1]} 个在租订单`][i];
      m = source.match(/^(\d+)\s+новых за период$/);
      if (m) return [`${m[1]} khách mới trong kỳ`,`${m[1]} new in period`,`${m[1]}명 신규`,`${m[1]} 位期间新客`][i];
      m = source.match(/^(\d+)\s+сотрудников$/);
      if (m) return [`${m[1]} nhân viên`,`${m[1]} employees`,`${m[1]}명 직원`,`${m[1]} 名员工`][i];
      m = source.match(/^(\d+)\s+прав$/);
      if (m) return [`${m[1]} quyền`,`${m[1]} permissions`,`${m[1]}개 권한`,`${m[1]} 项权限`][i];
      m = source.match(/^К оплате осталось\s+(.+)$/);
      if (m) return [`Còn phải trả ${m[1]}`,`Remaining to pay ${m[1]}`,`남은 결제액 ${m[1]}`,`剩余应付 ${m[1]}`][i];
      m = source.match(/^Зачислено\s+(.+)\s+·\s+всего внесено\s+(.+)$/);
      if (m) return [`Đã ghi nhận ${m[1]} · tổng đã trả ${m[2]}`,`Credited ${m[1]} · total paid ${m[2]}`,`${m[1]} 반영 · 총 결제 ${m[2]}`,`已入账 ${m[1]} · 累计支付 ${m[2]}`][i];
      m = source.match(/^Внесено\s+(.+)\s+·\s+остаток\s+(.+)$/i);
      if (m) return [`Đã trả ${m[1]} · còn lại ${m[2]}`,`Paid ${m[1]} · balance ${m[2]}`,`결제 ${m[1]} · 잔액 ${m[2]}`,`已支付 ${m[1]} · 剩余 ${m[2]}`][i];
      m = source.match(/^След\. ТО:\s*(.+)$/);
      if (m) return [`Bảo dưỡng tiếp: ${m[1]}`,`Next service: ${m[1]}`,`다음 정비: ${m[1]}`,`下次保养：${m[1]}`][i];
      m = source.match(/^Оплачено:\s*(.+)$/);
      if (m) return [`Đã thanh toán: ${m[1]}`,`Paid: ${m[1]}`,`결제됨: ${m[1]}`,`已支付：${m[1]}`][i];
      return null;
    }

    function recognize(raw) {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const exact = sourceByTarget.get(trimmed);
      if (exact) return exact;
      return pattern(trimmed, 'en') !== null ? trimmed : null;
    }

    function translateSource(source, lang) {
      return directFromSource(source, lang) ?? pattern(source, lang) ?? source;
    }

    function translateTextNode(node, lang) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style')) return;
      if (!originalText.has(node)) {
        const recognized = recognize(node.nodeValue || '');
        if (!recognized) return;
        originalText.set(node, recognized);
      }
      const source = originalText.get(node);
      const raw = node.nodeValue || '';
      const lead = raw.match(/^\s*/)?.[0] || '';
      const trail = raw.match(/\s*$/)?.[0] || '';
      const next = lead + translateSource(source, lang) + trail;
      if (node.nodeValue !== next) node.nodeValue = next;
    }

    function translateAttributes(el, lang) {
      if (!(el instanceof Element)) return;
      const attrs = ['placeholder','aria-label','title'];
      let saved = originalAttrs.get(el);
      if (!saved) { saved = {}; originalAttrs.set(el, saved); }
      for (const attr of attrs) {
        if (!el.hasAttribute(attr)) continue;
        if (!(attr in saved)) {
          const recognized = recognize(el.getAttribute(attr) || '');
          if (!recognized) continue;
          saved[attr] = recognized;
        }
        if (!(attr in saved)) continue;
        const next = translateSource(saved[attr], lang);
        if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
      }
    }

    function apply(scope = document.body) {
      if (!scope) return;
      const lang = currentLanguage();
      if (scope.nodeType === Node.TEXT_NODE) translateTextNode(scope, lang);
      if (scope.nodeType === Node.ELEMENT_NODE) translateAttributes(scope, lang);
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateTextNode(node, lang);
      if (scope.querySelectorAll) scope.querySelectorAll('*').forEach((el) => translateAttributes(el, lang));
    }

    apply(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const added of record.addedNodes) {
        if (added.nodeType === Node.TEXT_NODE || added.nodeType === Node.ELEMENT_NODE) apply(added);
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
    document.addEventListener('change', (event) => {
      if (event.target?.id === 'uniqLanguageSelect') queueMicrotask(() => apply(document.body));
    });
  }

  async function init() {
    try { makeRuntime(await loadDictionary()); }
    catch (error) { console.error('[UNIQ i18n current]', error); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else void init();
})();
