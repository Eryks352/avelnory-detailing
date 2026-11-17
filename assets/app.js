/* AVELNORY v2 — kalkulator demo i formularz zgłoszeń.
   Logika formularza przeniesiona z v1 (walidacja, honeypot, UID, kolejka localStorage, mailto, blokada dubli, FORM_ENDPOINT).
   Poprawki z raportu testów v1: F1 mailto zawsze w panelu kolejki, F2 TEST_MODE → testowe: 1, F3 jeden formatter liczb. */
(() => {
  'use strict';
  const cfg = window.AVELNORY_CONFIG;
  const $ = id => document.getElementById(id);
  const form = $('lead-form');
  const KEY = 'avelnory.queue.v1', SENT = 'avelnory.sent.v1', LOCK = 'avelnory.send-lock.v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false, locked = false, completed = false, currentUid = null, quote = '';

  // F3: zawsze grupowanie tysięcy (pl-PL domyślnie nie grupuje liczb 4-cyfrowych).
  let fmt;
  try { fmt = new Intl.NumberFormat('pl-PL', { useGrouping: 'always' }); fmt.format(1000); } catch { fmt = null; }
  const money = n => fmt ? fmt.format(n) : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  window.AVELNORY_MONEY = money;

  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : 'av-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v); } n.append(...kids); return n; };
  const picture = (base, alt, sizes, w, h, eager) => {
    const p = el('picture');
    p.append(el('source', { type: 'image/avif', srcset: `assets/img/${base}-800.avif 800w, assets/img/${base}-1600.avif 1600w`, sizes }));
    const img = el('img', { src: `assets/img/${base}-800.webp`, srcset: `assets/img/${base}-800.webp 800w, assets/img/${base}-1600.webp 1600w`, sizes, width: w, height: h, alt, decoding: 'async' });
    if (!eager) img.loading = 'lazy';
    p.append(img); return p;
  };

  /* ---------- KALKULATOR ---------- */
  const calc = $('calculator');
  const CAR_ALT = { small: 'Małe auto, hatchback', medium: 'Średnie auto, sedan', suv: 'SUV', van: 'Van osobowy' };
  const GROUPS = [
    { key: 'correction', name: 'Korekta lakieru', img: 'macro-polish', alt: 'Polerka na czarnym lakierze: hologramy i lustro' },
    { key: 'ceramic', name: 'Ceramika', img: 'macro-beads', alt: 'Krople wody na lakierze po ceramice' },
    { key: 'ppf', name: 'Folia PPF', img: 'macro-ppf', alt: 'Rakla nakładająca folię PPF' },
    { key: 'inside', name: 'Wnętrze', img: 'macro-interior', alt: 'Przeszycia czarnego skórzanego fotela' }
  ];
  const groupOf = k => k.startsWith('correction') ? 'correction' : k.startsWith('ceramic') ? 'ceramic' : k.startsWith('ppf') ? 'ppf' : 'inside';

  const carsBox = $('cars');
  Object.entries(cfg.cars).forEach(([k, c], i) => {
    const input = el('input', { type: 'radio', name: 'car', value: k, id: 'car-' + k });
    const tile = el('span', { class: 'car' }, picture('car-' + k, CAR_ALT[k] || c.label, '(max-width:720px) 50vw, 28vw', 1600, 800), el('span', { class: 'car__name' }, el('span', { text: c.label }), el('span', { class: 'num', text: '×' + String(c.factor).replace('.', ',') })));
    carsBox.append(el('label', { class: 'opt', for: 'car-' + k }, input, tile));
  });

  const svcBox = $('services'), fig = $('svc-fig');
  GROUPS.forEach(g => {
    const entries = Object.entries(cfg.services).filter(([k]) => groupOf(k) === g.key);
    if (!entries.length) return;
    const wrap = el('div', { class: 'svc__group', role: 'group', 'aria-label': g.name }, el('p', { class: 'label', text: g.name }));
    entries.forEach(([k, s]) => {
      const short = s.label.includes(' — ') ? s.label.split(' — ')[1] : s.label;
      const input = el('input', { type: 'radio', name: 'service', value: k, id: 'svc-' + k });
      const row = el('span', { class: 'svc__row' }, el('span', { text: short.charAt(0).toUpperCase() + short.slice(1) }), el('span', { class: 'num', text: 'od ' + money(s.min) + ' zł' }));
      const lab = el('label', { class: 'opt', for: 'svc-' + k }, input, row);
      lab.setAttribute('aria-label', s.label + ', od ' + money(s.min) + ' zł');
      wrap.append(lab);
    });
    svcBox.append(wrap);
    const img = picture(g.img, g.alt, '(max-width:1100px) 40vw, 24vw', 1600, 1067).querySelector('img');
    const pic = img.parentElement; pic.dataset.group = g.key; fig.append(pic);
  });
  fig.append(el('figcaption', { class: 'label', id: 'svc-cap' }));

  const condBox = $('conditions');
  Object.entries(cfg.conditions).forEach(([k, c], i) => {
    const input = el('input', { type: 'radio', name: 'condition', value: k, id: 'cond-' + k });
    condBox.append(el('label', { class: 'opt', for: 'cond-' + k }, input, el('span', { class: 'cond' }, el('span', { class: 'swatch', 'data-c': k }), el('span', {}, el('span', { class: 'label', text: '×' + String(c.factor).replace('.', ',') }), el('br'), el('span', { class: 'cond__name', text: c.label })))));
  });

  // Duży obraz wybranej klasy auta w panelu wyniku.
  const resPic = $('res-pic');
  Object.keys(cfg.cars).forEach(k => { const p = picture('car-' + k, '', '(max-width:1100px) 90vw, 30vw', 1600, 800); p.dataset.car = k; resPic.append(p); });

  calc.elements.car.value = 'medium'; calc.elements.service.value = 'ceramic3'; calc.elements.condition.value = 'normal';

  const maxH = Math.ceil(Math.max(...Object.values(cfg.services).map(s => s.hours[1])) * Math.max(...Object.values(cfg.cars).map(c => c.factor)) * Math.max(...Object.values(cfg.conditions).map(c => c.factor)));
  const bar = document.querySelector('.hours__bar');
  if (bar) bar.style.background = `repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px ${(8 / maxH * 100).toFixed(3)}%)`;

  let shown = null, rollRaf = 0;
  function roll(from, to) {
    const out = $('res-price'), dock = $('dock-price');
    const paint = (a, b) => { const t = `${money(a)}–${money(b)}`; out.textContent = t; dock.textContent = t + ' zł'; };
    cancelAnimationFrame(rollRaf);
    if (!from || reduced) { paint(to[0], to[1]); return; }
    const t0 = performance.now(), D = 750;
    const step = now => {
      const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(2, -10 * k);
      paint(Math.round((from[0] + (to[0] - from[0]) * e) / 10) * 10, Math.round((from[1] + (to[1] - from[1]) * e) / 10) * 10);
      if (k < 1) rollRaf = requestAnimationFrame(step); else paint(to[0], to[1]);
    };
    rollRaf = requestAnimationFrame(step);
  }

  function calculate() {
    const ck = calc.elements.car.value, sk = calc.elements.service.value, dk = calc.elements.condition.value;
    const car = cfg.cars[ck], service = cfg.services[sk], condition = cfg.conditions[dk];
    const factor = car.factor * (service.paint ? condition.factor : 1);
    const low = Math.ceil(service.min * factor / 50) * 50, high = Math.ceil(service.max * factor / 50) * 50;
    const hours = service.hours.map(n => Math.ceil(n * factor));
    const condLabel = service.paint ? condition.label : 'stan lakieru nie dotyczy';
    quote = `PRZYKŁAD: ${car.label}; ${service.label}; ${condLabel}; ${money(low)}–${money(high)} zł; ${hours[0]}–${hours[1]} h pracy.`;
    $('cond-set').disabled = !service.paint;
    $('condition-note').textContent = service.paint ? 'Stan lakieru wpływa na przykładową cenę i czas.' : 'Dla wnętrza stan lakieru nie wpływa na cenę ani czas.';
    $('res-what').textContent = `Auto: ${car.label.toLowerCase().replace('suv', 'SUV')} · ${service.label}${service.paint ? ' · ' + condition.label.toLowerCase() : ''}`;
    roll(shown, [low, high]); shown = [low, high];
    $('res-hours').textContent = `${hours[0]}–${hours[1]} h pracy`;
    const d0 = Math.ceil(hours[0] / 8), d1 = Math.ceil(hours[1] / 8);
    $('res-days').textContent = d0 === d1 ? `≈ ${d0} ${d0 === 1 ? 'dzień' : 'dni'} po 8 h` : `≈ ${d0}–${d1} dni po 8 h`;
    const hb = document.querySelector('.hours');
    hb.style.setProperty('--hmin', (hours[0] / maxH).toFixed(4)); hb.style.setProperty('--hmax', (hours[1] / maxH).toFixed(4));
    $('estimate').textContent = `${car.label} / ${service.label}: ${money(low)}–${money(high)} zł, ${hours[0]}–${hours[1]} godzin pracy.`;
    resPic.querySelectorAll('img').forEach(i => i.classList.toggle('is-on', i.parentElement.dataset.car === ck));
    const g = groupOf(sk);
    fig.querySelectorAll('img').forEach(i => i.classList.toggle('is-on', i.parentElement.dataset.group === g));
    $('svc-cap').textContent = GROUPS.find(x => x.key === g).name;
  }
  calc.addEventListener('submit', e => { e.preventDefault(); calculate(); });
  calc.addEventListener('change', calculate); calculate();

  const scrollToEl = (node) => { if (window.__lenis) window.__lenis.scrollTo(node, { offset: -8 }); else node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
  $('transfer').addEventListener('click', () => {
    if (completed) resetForm();
    form.elements.wycena_demo.value = quote;
    $('attached-estimate').textContent = 'Dołączona wycena: ' + quote;
    scrollToEl($('formularz')); form.elements.nazwa_studia.focus({ preventScroll: true });
  });
  $('dock-btn').addEventListener('click', e => { e.preventDefault(); $('transfer').click(); });
  document.querySelectorAll('[data-package]').forEach(a => a.addEventListener('click', () => {
    if (completed) resetForm(); form.elements.pakiet.value = a.dataset.package;
  }));

  /* ---------- FORMULARZ ---------- */
  const MSG = {
    valueMissing: 'Uzupełnij to pole, żebyśmy mogli odpisać.',
    typeMismatch: { email: 'Wpisz adres e-mail, np. biuro@twojestudio.pl.', url: 'Wpisz pełny adres, zaczynając od https://.' },
    patternMismatch: 'Wpisz 7–25 znaków: cyfry, +, spacje, nawiasy lub myślniki.',
    consent: 'Zaznacz zgodę, żebyśmy mogli odpowiedzieć.'
  };
  const fields = [...form.querySelectorAll('input:not([type=hidden]):not([name=website_extra]),select,textarea')];
  fields.forEach(f => {
    const id = 'err-' + f.name; const err = el('span', { class: 'err', id, 'aria-hidden': 'true' });
    if (f.type === 'checkbox') f.closest('label').after(err); else f.parentElement.append(err);
    f.setAttribute('aria-describedby', id);
    f.addEventListener('input', () => { if (f.validity.valid) { err.textContent = ''; f.removeAttribute('aria-invalid'); } });
  });
  function validate() {
    let first = null;
    fields.forEach(f => {
      const err = $('err-' + f.name); let m = '';
      if (!f.validity.valid) {
        if (f.type === 'checkbox') m = MSG.consent;
        else if (f.validity.valueMissing) m = MSG.valueMissing;
        else if (f.validity.typeMismatch) m = MSG.typeMismatch[f.type] || MSG.valueMissing;
        else if (f.validity.patternMismatch) m = MSG.patternMismatch;
        else m = f.validationMessage;
      }
      err.textContent = m;
      if (m) { f.setAttribute('aria-invalid', 'true'); first ||= f; } else f.removeAttribute('aria-invalid');
    });
    if (first) first.focus();
    return !first;
  }

  const KEEP_OUT = new Set(['status', 'przypisane_do', 'notatki']);
  function emailLink(record) {
    const body = Object.entries(record).filter(([k]) => !KEEP_OUT.has(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
    const subject = (record.testowe ? '[TEST] ' : '') + 'Zgłoszenie AVELNORY ' + record.zgloszenie_uid;
    return `mailto:${cfg.CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function queue() {
    const data = read(KEY, []);
    return Array.isArray(data) ? data.filter(r => Date.parse(r.utworzono) > Date.now() - cfg.QUEUE_TTL_DAYS * 86400000) : [];
  }
  function sent() { return read(SENT, []).filter(r => r.time > Date.now() - 30 * 86400000); }
  function savePending(record) {
    const rows = queue().filter(r => r.zgloszenie_uid !== record.zgloszenie_uid);
    write(KEY, [...rows, record]);
  }
  function queueUI() {
    const rows = queue();
    $('queue-panel').hidden = !rows.length;
    $('queue-status').textContent = `Na tym urządzeniu: ${rows.length} ${rows.length === 1 ? 'niewysłane zgłoszenie' : 'niewysłanych zgłoszeń'}. Zapis wygasa po ${cfg.QUEUE_TTL_DAYS} dniach. Wyślij je e-mailem albo ponów wysyłkę — nic nie wychodzi automatycznie.`;
    // F1: gotowy e-mail dla każdego rekordu w kolejce, także po odświeżeniu strony.
    const list = $('queue-mails'); list.replaceChildren();
    rows.forEach(r => list.append(el('li', {}, el('a', { href: emailLink(r), text: `Wyślij e-mailem: ${r.nazwa_studia} · ${r.zgloszenie_uid.slice(0, 8)}` }))));
    $('retry').disabled = busy || locked;
  }
  async function send(record) {
    if (sent().some(r => r.uid === record.zgloszenie_uid)) return;
    if (!cfg.FORM_ENDPOINT) throw new Error('no_endpoint');
    const payload = { ...record, subject: (record.testowe ? '[TEST] ' : '') + 'Zgłoszenie AVELNORY Studio', replyto: record.email, botcheck: '' };
    if (cfg.FORM_PROVIDER === 'web3forms') {
      if (!cfg.WEB3FORMS_ACCESS_KEY) throw new Error('no_key');
      payload.access_key = cfg.WEB3FORMS_ACCESS_KEY;
    }
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), cfg.REQUEST_TIMEOUT_MS);
    let response;
    try {
      const headers = { Accept: 'application/json' };
      let body;
      if (cfg.FORM_FORMAT === 'formdata') { body = new FormData(); Object.entries(payload).forEach(([k, v]) => body.append(k, String(v))); }
      else { headers['Content-Type'] = 'application/json'; body = JSON.stringify(payload); }
      response = await fetch(cfg.FORM_ENDPOINT, { method: 'POST', headers, body, signal: controller.signal });
      if (!response.ok) throw new Error('http_' + response.status);
      let result;
      try { result = await response.json(); } catch { if (cfg.FORM_PROVIDER !== 'generic') throw new Error('invalid_response'); }
      if (result?.success === false || result?.ok === false || (cfg.FORM_PROVIDER === 'web3forms' && result?.success !== true)) throw new Error('provider_rejected');
      // Dopiero po akceptacji odbiornika oznaczamy jako dostarczone.
      write(SENT, [...sent(), { uid: record.zgloszenie_uid, time: Date.now() }]);
      write(KEY, queue().filter(r => r.zgloszenie_uid !== record.zgloszenie_uid));
    } finally { clearTimeout(timeout); }
  }
  async function exclusive(fn) {
    // Web Locks blokuje także między kartami. Fallback: blokada tej karty i dzierżawa w localStorage.
    if (navigator.locks) return navigator.locks.request('avelnory-send', { ifAvailable: true }, lock => { if (!lock) throw new Error('locked'); return fn(); });
    const now = Date.now(), previous = read(LOCK, null);
    if (previous && previous.until > now) throw new Error('locked');
    const token = uuid(); write(LOCK, { token, until: now + 120000 });
    try { return await fn(); } finally { if (read(LOCK, {})?.token === token) localStorage.removeItem(LOCK); }
  }
  function show(record, delivered, stored) {
    completed = true; form.hidden = true; $('confirmation').hidden = false;
    $('confirmation-title').textContent = delivered ? `Dziękujemy, ${record.imie}. Zgłoszenie dotarło.` : stored ? 'Zgłoszenie zapisane na tym urządzeniu.' : 'Zgłoszenie nie zostało wysłane ani zapisane.';
    $('confirmation-text').textContent = delivered ? `Odpiszemy na ${record.email} w ciągu 1 dnia roboczego i zaproponujemy rozmowę 15 minut.` : `${stored ? 'Zachowaliśmy je w lokalnej kolejce przeglądarki. ' : 'Przeglądarka nie pozwala na zapis lokalny. '}Nie mamy potwierdzenia odbioru. Wyślij gotowy e-mail albo ponów wysyłkę z kolejki. Samo otwarcie e-maila nie wysyła wiadomości.`;
    $('uid').textContent = record.zgloszenie_uid; $('next-steps').hidden = !delivered;
    $('fallback-email').hidden = delivered; $('fallback-email').href = emailLink(record);
    $('confirmation').focus();
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy || completed || locked) return;
    if (!validate()) return;
    if (form.elements.website_extra.value) { $('form-error').textContent = 'Nie można wysłać tego formularza.'; return; }
    busy = true; $('submit').disabled = true; $('form-error').textContent = '';
    currentUid ||= uuid();
    const fd = new FormData(form);
    const record = { zgloszenie_uid: currentUid, utworzono: new Date().toISOString(), zrodlo: 'strona-avelnory', nazwa_studia: fd.get('nazwa_studia').trim(), imie: fd.get('imie').trim(), email: fd.get('email').trim(), telefon: fd.get('telefon').trim(), miasto: fd.get('miasto').trim(), pakiet: fd.get('pakiet'), wycena_demo: fd.get('wycena_demo'), wiadomosc: fd.get('wiadomosc').trim(), link: fd.get('link'), zgoda: true, zgoda_wersja: '2026-11-17', status: 'nowe', przypisane_do: '', notatki: '', testowe: cfg.TEST_MODE ? 1 : 0 };
    let stored = false, delivered = false;
    try { savePending(record); stored = true; } catch { /* mailto działa także bez pamięci */ }
    try { await exclusive(() => send(record)); delivered = true; } catch { /* kolejka z tym samym UID zostaje */ }
    show(record, delivered, stored); busy = false; $('submit').disabled = false; queueUI();
  });
  function resetForm() { completed = false; currentUid = null; form.reset(); form.hidden = false; $('confirmation').hidden = true; $('attached-estimate').textContent = ''; form.elements.wycena_demo.value = ''; fields.forEach(f => { $('err-' + f.name).textContent = ''; f.removeAttribute('aria-invalid'); }); }
  $('new-request').addEventListener('click', resetForm);
  $('retry').addEventListener('click', async () => {
    if (busy || locked) return;
    if (!cfg.FORM_ENDPOINT) { $('form-error').textContent = 'Odbiornik nie jest jeszcze podłączony. Użyj linku „Wyślij e-mailem” powyżej.'; return; }
    busy = true; queueUI(); let count = 0;
    try { await exclusive(async () => { for (const record of queue()) { await send(record); count++; if (record.zgloszenie_uid === currentUid) show(record, true, true); } }); $('form-error').textContent = `Odbiornik przyjął zgłoszenia: ${count}.`; }
    catch { $('form-error').textContent = `Przyjęte: ${count}. Pozostałe zgłoszenia nadal są w kolejce. Spróbuj później lub wyślij e-mailem.`; }
    finally { busy = false; queueUI(); }
  });
  $('export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(queue(), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'avelnory-zgloszenia.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('clear').addEventListener('click', () => { if (confirm('Usunąć wszystkie niewysłane zgłoszenia z tej przeglądarki?')) { try { localStorage.removeItem(KEY); queueUI(); } catch { $('form-error').textContent = 'Nie udało się usunąć danych.'; } } });
  window.addEventListener('storage', queueUI);
  // Usuń wygasłe rekordy przy uruchomieniu; nic nie wysyłaj automatycznie.
  try { write(KEY, queue()); } catch { /* tryb prywatny bez zapisu */ }
  queueUI();
})();
