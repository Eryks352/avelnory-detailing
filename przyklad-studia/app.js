/* Werniks (przykład) — kalkulator 8 usług, formularz zapytania, menu i godziny otwarcia.
   Logika cen jak w ../assets/app.js: cena × klasa auta × stan lakieru (tylko usługi lakiernicze),
   zaokrąglenie w górę do 50 zł, godziny w górę do pełnej godziny. Bez zewnętrznego endpointu:
   to strona pokazowa, zapytanie zostaje tylko w localStorage tej przeglądarki. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const base = window.AVELNORY_CONFIG;
  if (!base) { $('cond-note').textContent = 'Nie udało się wczytać cennika. Zapytaj o wycenę w formularzu.'; return; }

  // Pakiet START: maks. 8 usług — przykład pomija ceramikę 5-letnią.
  const SERVICES = ['correction1', 'correction2', 'ceramic1', 'ceramic3', 'ppfFront', 'ppfFull', 'interior', 'upholstery'];
  const cfg = { cars: base.cars, conditions: base.conditions, services: Object.fromEntries(SERVICES.map(k => [k, base.services[k]])) };
  const KEY = 'werniks.demo.inquiries.v1', TTL_DAYS = 7;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let fmt;
  try { fmt = new Intl.NumberFormat('pl-PL', { useGrouping: 'always' }); fmt.format(1000); } catch { fmt = null; }
  const money = n => fmt ? fmt.format(n) : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'we-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const read = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(d) ? d.filter(r => Date.parse(r.utworzono) > Date.now() - TTL_DAYS * 864e5) : []; } catch { return []; } };
  const el = (tag, attrs = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else n.setAttribute(k, v); } n.append(...kids); return n; };
  // Twarda spacja po jednoliterowych spójnikach/przyimkach w etykietach z konfiguracji.
  const pretty = t => t.replace(/^PRZYKŁAD: /, '').replace(/; /g, ', ').replace(/(\d)–(\d)/g, '$1⁠–⁠$2').replace(/\.$/, '');
  const nbsp = t => t.replace(/(^|\s)([aiouwzAIOUWZ])\s/g, '$1$2 ');

  /* ---------- KALKULATOR ---------- */
  const calc = $('calc');
  function chips(container, name, entries, extra) {
    entries.forEach(([key, item], i) => {
      const input = el('input', { type: 'radio', name, value: key, id: `${name}-${key}` });
      if (i === 0) input.checked = true;
      const label = el('label', { for: input.id }, el('span', { class: 'chip-label', text: nbsp(item.label) }));
      if (extra) label.append(el('span', { class: 'chip-meta', text: extra(item) }));
      container.append(input, label);
    });
  }
  chips($('cars'), 'car', Object.entries(cfg.cars));
  chips($('services'), 'service', Object.entries(cfg.services), s => `od ${money(s.min)} zł`);
  chips($('conds'), 'condition', Object.entries(cfg.conditions));

  function estimate(ck, sk, dk) {
    const car = cfg.cars[ck], service = cfg.services[sk], condition = cfg.conditions[dk];
    const factor = car.factor * (service.paint ? condition.factor : 1);
    return {
      car, service, condition,
      low: Math.ceil(service.min * factor / 50) * 50,
      high: Math.ceil(service.max * factor / 50) * 50,
      hours: service.hours.map(n => Math.ceil(n * factor))
    };
  }
  window.WERNIKS_ESTIMATE = estimate; // do testu kombinacji

  let shown = null, raf = 0, quote = '';
  function roll(to) {
    const node = $('price'), text = ([a, b]) => `${money(a)}–${money(b)}`;
    cancelAnimationFrame(raf);
    if (reduced || !shown) { node.textContent = text(to); shown = to; return; }
    const from = shown, t0 = performance.now(), dur = 520;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      const cur = from.map((f, i) => p === 1 ? to[i] : Math.round((f + (to[i] - f) * e) / 10) * 10);
      node.textContent = text(cur);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    shown = to; raf = requestAnimationFrame(step);
  }

  function calculate() {
    const ck = calc.elements.car.value, sk = calc.elements.service.value, dk = calc.elements.condition.value;
    const r = estimate(ck, sk, dk);
    const paint = r.service.paint;
    $('cond-set').disabled = !paint;
    $('cond-note').textContent = paint ? 'Stan lakieru zmienia zakres pracy, więc i cenę.' : 'Przy wnętrzu stan lakieru nie wpływa na cenę.';
    roll([r.low, r.high]);
    $('res-what').textContent = `${r.car.label} auto, ${r.service.label.toLowerCase()}${paint ? ', ' + r.condition.label.toLowerCase() : ''}`.replace('SUV auto', 'SUV').replace('Van auto', 'Van').replace(/ppf/g, 'PPF');
    const d0 = Math.ceil(r.hours[0] / 8), d1 = Math.ceil(r.hours[1] / 8);
    $('res-time').textContent = `${r.hours[0]}–${r.hours[1]} h pracy, ${d0 === d1 ? `${d0} ${d0 === 1 ? 'dzień' : 'dni'}` : `${d0}–${d1} dni`} w studiu`;
    quote = `PRZYKŁAD: ${r.car.label}; ${r.service.label}; ${paint ? r.condition.label : 'stan lakieru nie dotyczy'}; ${money(r.low)}–${money(r.high)} zł; ${r.hours[0]}–${r.hours[1]} h pracy.`;
  }
  calc.addEventListener('change', calculate);
  calc.addEventListener('submit', e => e.preventDefault());
  calculate();

  /* ---------- FORMULARZ ---------- */
  const form = $('inquiry');
  const go = node => node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  function attach(text) {
    form.elements.wycena.value = text;
    $('attached-text').textContent = pretty(text);
    $('attached').hidden = !text;
  }
  $('to-form').addEventListener('click', () => {
    if (completed) resetForm();
    attach(quote); go($('zapytanie')); form.elements.imie.focus({ preventScroll: true });
  });
  $('detach').addEventListener('click', () => attach(''));

  const MSG = { valueMissing: 'Uzupełnij to pole.', email: 'Wpisz adres e-mail, np. jan@poczta.pl.', pattern: 'Wpisz numer: 7–25 cyfr, spacje, +, nawiasy lub myślniki.', consent: 'Zaznacz zgodę, żeby studio mogło odpowiedzieć.' };
  const fields = [...form.querySelectorAll('input:not([type=hidden]):not([name=website_extra]),select,textarea')];
  fields.forEach(f => {
    const id = 'err-' + f.name, err = el('span', { class: 'err', id });
    if (f.type === 'checkbox') f.closest('label').after(err); else f.closest('.field').append(err);
    f.setAttribute('aria-describedby', id);
    f.addEventListener('input', () => { if (f.validity.valid) { err.textContent = ''; f.removeAttribute('aria-invalid'); } });
  });
  function validate() {
    let first = null;
    fields.forEach(f => {
      let m = '';
      if (!f.validity.valid) m = f.type === 'checkbox' ? MSG.consent : f.validity.valueMissing ? MSG.valueMissing : f.validity.typeMismatch ? MSG.email : f.validity.patternMismatch ? MSG.pattern : f.validationMessage;
      $('err-' + f.name).textContent = m;
      if (m) { f.setAttribute('aria-invalid', 'true'); first ||= f; } else f.removeAttribute('aria-invalid');
    });
    if (first) first.focus();
    return !first;
  }

  let busy = false, completed = false, currentUid = null;
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (busy || completed) return; // blokada podwójnego kliknięcia
    $('form-error').textContent = '';
    if (!validate()) return;
    if (form.elements.website_extra.value) { $('form-error').textContent = 'Nie można wysłać tego formularza.'; return; }
    busy = true; $('send').disabled = true;
    currentUid ||= uuid();
    const fd = new FormData(form), v = k => String(fd.get(k) || '').trim();
    const record = { zgloszenie_uid: currentUid, utworzono: new Date().toISOString(), zrodlo: 'przyklad-werniks', imie: v('imie'), telefon: v('telefon'), email: v('email'), auto: v('auto'), termin: v('termin'), wiadomosc: v('wiadomosc'), wycena: v('wycena'), zgoda: true, przyklad: 1 };
    let stored = true;
    try { localStorage.setItem(KEY, JSON.stringify([...read().filter(r => r.zgloszenie_uid !== record.zgloszenie_uid), record])); } catch { stored = false; }
    show(record, stored);
    busy = false; $('send').disabled = false;
  });
  function show(record, stored) {
    completed = true; form.hidden = true; $('done').hidden = false;
    $('done-title').textContent = `Dziękujemy, ${record.imie}.`;
    const rows = [['Auto', record.auto], ['Kontakt', `${record.telefon}, ${record.email}`], ['Termin', record.termin], ['Wycena', record.wycena ? pretty(record.wycena) : 'bez wyceny z kalkulatora'], ['Numer', record.zgloszenie_uid.slice(0, 8)]];
    if (!stored) rows.push(['Zapis', 'przeglądarka nie pozwala na zapis lokalny — nic nie zachowano']);
    $('done-summary').replaceChildren(...rows.flatMap(([k, val]) => [el('dt', { text: k }), el('dd', { text: val })]));
    $('done').focus();
  }
  function resetForm() {
    completed = false; currentUid = null; form.reset(); attach(''); $('form-error').textContent = ''; form.hidden = false; $('done').hidden = true;
    fields.forEach(f => { $('err-' + f.name).textContent = ''; f.removeAttribute('aria-invalid'); });
  }
  $('again').addEventListener('click', () => { resetForm(); form.elements.imie.focus(); });
  $('wipe').addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch { /* brak dostępu do pamięci */ }
    resetForm(); $('form-error').textContent = 'Usunięto dane przykładu z tej przeglądarki.'; form.elements.imie.focus();
  });
  /* ---------- MENU, NAGŁÓWEK, GODZINY ---------- */
  const btn = document.querySelector('.menu-btn'), menu = $('menu');
  const setMenu = open => { btn.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); btn.textContent = open ? 'Zamknij' : 'Menu'; };
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); } });
  const top = $('top');
  const onScroll = () => top.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Godziny przykładowe; czas liczony w strefie Europe/Warsaw niezależnie od strefy odwiedzającego.
  const HOURS = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [9, 14] };
  const DAY = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  function status() {
    let d, h;
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
      d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday); h = +parts.hour + parts.minute / 60;
    } catch { return; }
    const today = HOURS[d], open = !!today && h >= today[0] && h < today[1];
    let short, long;
    if (open) { short = `Teraz otwarte, do ${today[1]}:00`; long = `Teraz otwarte, zamykamy o ${today[1]}:00`; }
    else {
      let n = d;
      if (today && h < today[0]) { long = `Teraz zamknięte, otwieramy dziś o ${today[0]}:00`; }
      else { do { n = (n + 1) % 7; } while (!HOURS[n]); long = `Teraz zamknięte, otwieramy ${n === (d + 1) % 7 ? 'jutro' : 'w ' + DAY[n]} o ${HOURS[n][0]}:00`; }
      short = long.replace('Teraz zamknięte, otwieramy', 'Otwieramy');
    }
    const s1 = document.querySelector('[data-open-status]'), s2 = document.querySelector('[data-open-status-long]');
    if (s1) { s1.textContent = short; s1.classList.toggle('is-open', open); }
    if (s2) { s2.textContent = long; s2.classList.toggle('is-open', open); }
    document.querySelectorAll('.hours tr[data-days]').forEach(tr => tr.classList.toggle('is-today', tr.dataset.days.split(',').includes(String(d))));
  }
  status(); setInterval(status, 60000);
})();
