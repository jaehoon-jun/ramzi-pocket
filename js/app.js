'use strict';
// 람지의 여행수첩
// - 여행·상품·메모는 data/*.js 에서 읽어온다 (두 사람 폰에 똑같이 보임)
// - 쇼핑·메모는 여행마다 따로, 포즈 레퍼런스는 모든 여행 공통
// - 환율 고정값, 구매 체크, 가격 표시 방식, 메모 숨김·순서, 고른 여행은 이 폰의 localStorage 에만 저장된다
//   (환율·구매 체크·메모 숨김·순서는 여행마다 따로 저장)
(() => {
  const KEY = 'ramziNote:v1:';
  const saved = {
    get(k, fallback) {
      try { const v = localStorage.getItem(KEY + k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 이번 접속 동안만 유지 */ }
    }
  };
  const CDN = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    sortable: 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js'
  };
  const MEMO_COLORS = ['lemon', 'mint', 'peach', 'lavender', 'sky'];
  // 상점 머리글자 동그라미 색 (상점이 나오는 순서대로 돌려 씀)
  // 컬러 이름 → 동그라미 색. 목록에 없는 이름은 동그라미 없이 글자만 표시
  const SWATCH = {
    black: '#1A1A1A', white: '#FFFFFF', cream: '#F1E8D6', ivory: '#F6F0E1', offwhite: '#F4F0E6', 'off white': '#F4F0E6', 'off-white': '#F4F0E6', beige: '#D9C7A7', gray: '#9B9B9B', grey: '#9B9B9B',
    navy: '#27324F', blue: '#4A6FA5', green: '#6F8F6A', khaki: '#8A8455', pink: '#E9B7C2', red: '#B03A3A', brown: '#7A5236',
    '검정': '#1A1A1A', '블랙': '#1A1A1A', '흰색': '#FFFFFF', '화이트': '#FFFFFF', '크림': '#F1E8D6', '베이지': '#D9C7A7', '회색': '#9B9B9B', '그레이': '#9B9B9B',
    '네이비': '#27324F', '파랑': '#4A6FA5', '초록': '#6F8F6A', '그린': '#6F8F6A', '분홍': '#E9B7C2', '핑크': '#E9B7C2', '빨강': '#B03A3A', '갈색': '#7A5236', '브라운': '#7A5236'
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('ko-KR');
  const parseNum = t => { const s = String(t).replace(/[^0-9.]/g, ''); return s === '' ? NaN : parseFloat(s); };
  const pad2 = n => String(n).padStart(2, '0');
  const icon = (id, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}"><use href="#${id}"/></svg>`;

  let trips, trip, tripId, items, memos, refs;
  let rate = null;
  let purchased = saved.get('purchased', {});
  let priceMode = saved.get('priceMode', 'krw');
  let memoHidden = saved.get('memoHidden', []);
  let memoOrder = saved.get('memoOrder', null);
  let shopStore = 'all';
  let refCat = 'all';
  let refFav = saved.get('refFav', []); // 즐겨찾기한 사진 id (이 폰에만 저장)
  const REF_CATS = ['커플', '솔로', '실내'];

  // 원화 = 현지 가격 × 고정값, 소수점 이하 버림 (부동소수 오차로 9114.9999… 처럼 되는 것 방지)
  const toKrw = local => (rate > 0 && Number.isFinite(local)) ? Math.floor(local * rate + 1e-9) : null;
  const krwText = local => { const v = toKrw(local); return v == null ? '-' : fmt(v); };
  const isDone = it => !!purchased[it.id];
  const hasLocal = it => typeof it.localPrice === 'number' && Number.isFinite(it.localPrice); // 현지 가격을 아직 모르면 null

  // 여행별 저장값: "purchased@milan" 처럼 여행 id 를 붙여 저장.
  // 여행이 하나뿐이던 시절의 값(이름에 @ 없음)은 첫 번째 여행(후쿠오카) 것으로 이어서 씀
  const tripKey = k => k + '@' + tripId;
  const tripGet = (k, fallback) => {
    const v = saved.get(tripKey(k), undefined);
    if (v !== undefined) return v;
    return tripId === trips[0].id ? saved.get(k, fallback) : fallback;
  };
  const tripSet = (k, v) => saved.set(tripKey(k), v);

  /* ---------- 공통 ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1600);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* 아래 방식으로 다시 시도 */ }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  const scripts = {};
  function loadScript(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error(src)); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }

  function photoUrl(p) {
    return /^https?:\/\//.test(p) ? p : 'images/' + String(p).split('/').map(encodeURIComponent).join('/');
  }

  /* ---------- 탭 이동 ---------- */
  const TABS = ['home', 'rate', 'shop', 'memo', 'ref'];
  function show(tab) {
    if (!TABS.includes(tab)) tab = 'home';
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + tab));
    $$('.tab').forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
    window.scrollTo(0, 0);
  }

  /* ---------- 헤더 · 여행 선택 ---------- */
  const tripDate = t => [t.start, t.end].filter(Boolean).join(' — ');
  function renderHeaders() {
    const date = tripDate(trip) + (trip.purpose ? ' · ' + trip.purpose : '');
    // 여행이 둘 이상이면 지역명을 눌러 다른 여행을 고를 수 있게
    const name = trips.length > 1
      ? `<button class="trip-pick" aria-haspopup="dialog" aria-label="${esc(trip.name)}, 다른 여행 선택"><span class="trip-name">${esc(trip.name)}</span>${icon('down')}</button>`
      : `<span class="trip-name">${esc(trip.name)}</span>`;
    $$('.trip-h').forEach(h => {
      h.innerHTML = `${name}<span class="trip-date num">${esc(date)}</span>`;
    });
    document.title = 'Ramzi-Pocket';
  }

  let sheetOpener = null;
  function openTripSheet(opener) {
    sheetOpener = opener;
    const latest = trips[trips.length - 1].id;
    $('#trip-list').innerHTML = [...trips].reverse().map(t =>
      `<li><button data-trip="${esc(t.id)}" aria-current="${t.id === tripId}">` +
        `<span class="tl-txt"><b>${esc(t.name)}${t.id === latest ? '<em>최신</em>' : ''}</b><small class="num">${esc(tripDate(t) + (t.purpose ? ' · ' + t.purpose : ''))}</small></span>` +
        `${icon('check', 'tl-ck')}</button></li>`).join('');
    $('#trip-sheet').hidden = false;
    $('#trip-list button[aria-current="true"]').focus();
  }
  function closeTripSheet() {
    $('#trip-sheet').hidden = true;
    if (sheetOpener && document.contains(sheetOpener)) sheetOpener.focus();
    sheetOpener = null;
  }

  // 여행 바꾸기: 그 여행의 쇼핑·메모·환율·체크 상태를 불러와 전부 다시 그림
  const listFor = src => {
    if (Array.isArray(src)) return tripId === trips[0].id ? src : []; // 예전 형식(배열 하나)은 첫 여행 것
    return src && Array.isArray(src[tripId]) ? src[tripId] : [];
  };
  function loadTrip(id) {
    trip = trips.find(t => t.id === id) || trips[trips.length - 1]; // 처음엔 가장 최근 여행
    tripId = trip.id;
    saved.set('trip', tripId);
    items = listFor(window.SHOPPING);
    memos = listFor(window.MEMOS);
    purchased = tripGet('purchased', {});
    memoHidden = tripGet('memoHidden', []);
    memoOrder = tripGet('memoOrder', null);
    const r = tripGet('rate', null);
    rate = r && r.value > 0 ? Number(r.value) : (Number(trip.defaultRate) > 0 ? Number(trip.defaultRate) : null);
    $('#rate').value = rate > 0 ? String(rate) : '';
    $('#price').value = ''; $('#home-price').value = '';
    shopStore = 'all';
    if (sortable) setReorder(false);
    renderHeaders();
    syncRateInput();
    renderAllPrices();
    renderMemos();
  }

  /* ---------- 홈 ---------- */
  function renderHomeCalc() {
    const v = parseNum($('#home-price').value);
    $('#home-krw').textContent = Number.isNaN(v) ? '0' : krwText(v);
  }

  // 상품 하나라도 구매 체크했으면 그 브랜드는 방문 완료
  function renderHomeBrands() {
    const gs = groups();
    $('#home-brand-n').textContent = pad2(gs.filter(g => !g.items.some(isDone)).length);
    if (!gs.length) { $('#home-brands').innerHTML = '<li class="empty" style="grid-column:1/-1;cursor:default">아직 쇼핑 목록이 없어요</li>'; return; }
    $('#home-brands').innerHTML = gs.map(g => {
      const done = g.items.some(isDone);
      return `<li class="${done ? 'done' : ''}" data-go="shop" data-store="${esc(g.store)}">` +
        `<small>${esc(g.en || '·')}</small><b>${esc(g.store)}</b>${done ? '<em>방문 완료</em>' : ''}</li>`;
    }).join('');
  }

  /* ---------- 환율 ---------- */
  const STEPS = [100, 300, 500, 1000, 2000, 3000, 5000];
  function renderRateCalc() {
    const v = parseNum($('#price').value);
    $('#rc-krw').textContent = Number.isNaN(v) ? '0' : krwText(v);
    $('#rc-x').textContent = rate > 0 ? '× ' + rate : '× -';
    const steps = Array.isArray(trip.steps) && trip.steps.length ? trip.steps : STEPS;
    const near = Number.isNaN(v) ? null : steps.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
    $('#rc-tbl').innerHTML = steps.map(s =>
      `<tr${s === near ? ' class="hl"' : ''}><td>${fmt(s)}</td><td>${krwText(s)}원</td></tr>`).join('');
  }

  function syncRateInput() {
    const btn = $('#rate-save');
    const v = parseNum($('#rate').value);
    const same = v === rate;
    btn.classList.toggle('saved', same);
    btn.textContent = same ? '저장됨' : '저장';
    $('#rc-fix').classList.remove('err');
    $('#rate-msg').classList.remove('err');
    $('#rate-msg').textContent = rate > 0 ? '' : '먼저 고정값을 저장해 주세요';
  }

  // 입력칸 값이 올바른 환율이면 숫자, 아니면 null
  const readRateInput = () => {
    const raw = $('#rate').value.trim();
    const v = parseFloat(raw.replace(/,/g, ''));
    return raw && /^[0-9.,]+$/.test(raw) && v > 0 ? v : null;
  };
  function applyRate(v) {
    rate = v;
    tripSet('rate', { value: v, savedAt: new Date().toISOString() });
    renderAllPrices(); // 홈 계산기·환산표·쇼핑 금액 모두 새 환율로
  }

  // 입력하는 즉시 반영 (저장 버튼을 안 눌러도 홈 계산기에 바로 적용)
  function onRateInput() {
    const v = readRateInput();
    if (v != null && v !== rate) applyRate(v);
    syncRateInput();
  }

  function saveRate() {
    const v = readRateInput();
    if (v == null) {
      $('#rc-fix').classList.add('err');
      const msg = $('#rate-msg');
      msg.classList.add('err');
      msg.textContent = '0보다 큰 숫자만 저장할 수 있어요 (예: 8.5)';
      return;
    }
    if (v !== rate) applyRate(v);
    $('#rate').value = String(v);
    syncRateInput();
    toast('환율을 저장했어요');
  }

  /* ---------- 쇼핑 ---------- */
  function groups() {
    const map = new Map();
    items.forEach(it => {
      if (!map.has(it.store)) map.set(it.store, { store: it.store, en: it.storeEn || '', items: [] });
      map.get(it.store).items.push(it);
    });
    return [...map.values()];
  }

  function copyLabel(it) {
    return `${it.name}${it.color ? ' - ' + it.color : ''}${it.code ? ' ' + it.code : ''}`;
  }

  function lineHTML(it) {
    const krw = toKrw(it.localPrice);
    const hasPhotos = Array.isArray(it.photos) && it.photos.length > 0;
    const sw = it.color && SWATCH[String(it.color).trim().toLowerCase()];
    const tags = (it.size ? `<span class="tag">${esc(it.size)}</span>` : '') +
      (it.color ? `<span class="tag tag-c">${sw ? `<i style="background:${sw}"></i>` : ''}${esc(it.color)}</span>` : '');
    // 태그와 사진 아이콘은 한 덩어리로 묶어 줄바꿈 시 함께 넘어가게
    const extra = tags + (hasPhotos ? icon('img', 'ph-ico') + icon('down', 'chev') : '');
    const inner = `<span class="nm">${esc(it.name)}</span>${extra ? `<span class="tags">${extra}</span>` : ''}`;
    const title = hasPhotos ? `<button class="t" aria-expanded="false">${inner}</button>` : `<span class="t">${inner}</span>`;

    let meta;
    if (it.krPrice == null || it.krPrice === '') meta = '한국 가격 없음';
    else if (krw == null) meta = `한국 ${fmt(it.krPrice)}원`;
    else {
      const diff = it.krPrice - krw;
      meta = `한국 ${fmt(it.krPrice)}원 · ` + (diff > 0 ? `<em>▼ ${fmt(diff)}원 절약</em>` : diff < 0 ? '한국이 더 싸요' : '가격이 같아요');
    }
    const code = it.code ? `<div class="code num"><button class="cp" data-copy="${esc(copyLabel(it))}" aria-label="상품 이름과 코드 복사">Product Code: ${esc(it.code)}${icon('copy')}</button></div>` : '';
    const photos = hasPhotos ? `<div class="photos">${it.photos.map((p, i) =>
      `<button class="ph" data-src="${esc(photoUrl(p))}" aria-label="${esc(it.name)} 사진 ${i + 1} 크게 보기"><img src="${esc(photoUrl(p))}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : '';

    return `<div class="ln${isDone(it) ? ' done' : ''}" data-id="${esc(it.id)}">` +
      `<button class="box" aria-label="${esc(it.name)} 구매 체크" aria-pressed="${isDone(it)}">${icon('check')}</button>` +
      `<div class="main"><div class="t-row">${title}<span class="lead"></span></div>` +
        (it.nameJa ? `<div class="ja">${esc(it.nameJa)}</div>` : '') +
        `<div class="meta num">${meta}</div>${code}` +
        (it.note ? `<div class="memo-ln">※ ${esc(it.note)}</div>` : '') +
        photos + `</div>` +
      (hasLocal(it)
        ? `<span class="v num"><b class="p-krw">${krw == null ? '-' : fmt(krw) + '원'}</b><small class="p-krw">현지 ${fmt(it.localPrice)}</small>` +
          `<b class="p-loc">${fmt(it.localPrice)}</b><small class="p-loc">원화 ${krw == null ? '-' : fmt(krw) + '원'}</small></span>`
        : `<span class="v num"><b>-</b><small>현지 가격 미정</small></span>`) +
      `</div>`;
  }

  function renderShop() {
    const gs = groups();
    $('#store-tabs').innerHTML = [{ key: 'all', label: '전체', n: items.length }, ...gs.map(g => ({ key: g.store, label: g.store, n: g.items.length }))]
      .map(t => `<button role="tab" data-store="${esc(t.key)}" aria-selected="${t.key === shopStore}" class="${t.key === shopStore ? 'on' : ''}">${esc(t.label)}<em class="num">${t.n}</em></button>`).join('');

    // 펼쳐 둔 사진은 다시 그려도 그대로 유지
    const open = new Set($$('#receipts .ln.open').map(l => l.dataset.id));
    $('#receipts').innerHTML = gs.map(g => {
      const sumKrw = g.items.reduce((s, it) => s + (toKrw(it.localPrice) || 0), 0);
      const sumLoc = g.items.reduce((s, it) => s + (Number(it.localPrice) || 0), 0);
      const anyLocal = g.items.some(hasLocal);
      const krwSum = rate > 0 && anyLocal ? fmt(sumKrw) + '원' : '-';
      const locSum = anyLocal ? fmt(sumLoc) : '-';
      return `<section class="paper r-group" data-store="${esc(g.store)}">` +
        `<header class="rh">${g.en ? `<small>${esc(g.en)}</small>` : ''}<h3>${esc(g.store)}</h3></header>` +
        g.items.map(lineHTML).join('') +
        `<div class="rf num"><span>${g.items.length}개 소계</span><span class="rv">` +
          `<b class="p-krw">${krwSum}</b><small class="p-krw">현지 ${locSum}</small>` +
          `<b class="p-loc">${locSum}</b><small class="p-loc">원화 ${krwSum}</small></span></div>` +
        `</section>`;
    }).join('') + (items.length ? '<p class="r-empty" hidden>여기서 살 건 다 샀어요</p>' : '<p class="empty">아직 쇼핑 목록이 없어요</p>');
    open.forEach(id => { const ln = $(`#receipts .ln[data-id="${CSS.escape(id)}"]`); if (ln) setOpen(ln, true); });
    applyShop();
    renderSums();
  }

  function setOpen(ln, on) {
    ln.classList.toggle('open', on);
    const t = $('.t', ln); if (t && t.tagName === 'BUTTON') t.setAttribute('aria-expanded', on);
  }

  function applyShop() {
    const box = $('#receipts'), todo = $('#todo-only').checked;
    box.classList.toggle('todo', todo);
    box.classList.toggle('loc', priceMode === 'loc');
    let any = false;
    $$('.r-group', box).forEach(g => {
      const on = (shopStore === 'all' || g.dataset.store === shopStore) && (!todo || !!$('.ln:not(.done)', g));
      g.hidden = !on; any = any || on;
    });
    const empty = $('.r-empty', box);
    if (empty) empty.hidden = any;
  }

  function renderSums() {
    const bought = items.filter(isDone);
    const paid = bought.reduce((s, it) => s + (toKrw(it.localPrice) || 0), 0);
    const paidLoc = bought.reduce((s, it) => s + (Number(it.localPrice) || 0), 0);
    const save = bought.reduce((s, it) => {
      const k = toKrw(it.localPrice);
      return (it.krPrice == null || k == null) ? s : s + Math.max(0, it.krPrice - k);
    }, 0);
    $('#sum-cnt').textContent = `${bought.length} / ${items.length}개`;
    $('#sum-paid-loc').textContent = fmt(paidLoc);
    $('#sum-paid').textContent =rate > 0 ? fmt(paid) + '원' : '-';
    $('#sum-saved').textContent = save > 0 ? `▼ ${fmt(save)}원` : '0원';
  }

  function setPriceMode(mode) {
    priceMode = mode === 'loc' ? 'loc' : 'krw';
    saved.set('priceMode', priceMode);
    $$('#price-mode button').forEach(b => {
      const on = b.dataset.mode === priceMode;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    });
    applyShop();
  }

  function togglePurchase(ln) {
    const id = ln.dataset.id;
    const on = !purchased[id];
    if (on) purchased[id] = true; else delete purchased[id];
    tripSet('purchased', purchased);
    ln.classList.toggle('done', on);
    $('.box', ln).setAttribute('aria-pressed', on);
    ln.classList.remove('pop'); void ln.offsetWidth; ln.classList.add('pop');
    applyShop(); renderSums(); renderHomeBrands();
  }

  async function downloadXlsx() {
    const btn = $('#btn-xlsx');
    btn.disabled = true;
    try {
      await loadScript(CDN.xlsx);
      const head = ['번호', '판매처', '제품명', '컬러', '사이즈', '상품코드', '현지가격', '한국가격', '한화환산금액', '절약액', '구매여부'];
      let tLoc = 0, tKr = 0, tKrw = 0, tSave = 0;
      const rows = items.map((it, i) => {
        const k = toKrw(it.localPrice);
        const kr = it.krPrice == null || it.krPrice === '' ? null : Number(it.krPrice);
        const sv = kr == null || k == null ? null : kr - k;
        tLoc += Number(it.localPrice) || 0; tKr += kr || 0; tKrw += k || 0; tSave += sv || 0;
        const name = it.name + (it.nameJa ? ` (${it.nameJa})` : '') + (it.note ? ` ※${it.note}` : '');
        return [i + 1, it.store, name, it.color || '', it.size || '', String(it.code || ''), hasLocal(it) ? Number(it.localPrice) : '', kr ?? '', k ?? '', sv ?? '', isDone(it) ? 'O' : 'X'];
      });
      const done = items.filter(isDone).length;
      rows.push(['합계', '', '', '', '', '', tLoc, tKr, tKrw, tSave, `${done}/${items.length}`]);
      const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
      ws['!cols'] = [6, 12, 40, 10, 14, 12, 10, 10, 12, 10, 8].map(w => ({ wch: w }));
      // 상품코드는 문자로 (앞자리 0 보존)
      rows.forEach((r, i) => { const c = ws[XLSX.utils.encode_cell({ r: i + 1, c: 5 })]; if (c && r[5] !== '') { c.t = 's'; } });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '쇼핑리스트');
      const d = new Date();
      XLSX.writeFile(wb, `Ramzi-Pocket_${trip.name}_쇼핑리스트_${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}.xlsx`);
    } catch (e) {
      toast('엑셀을 만들지 못했어요. 인터넷 연결을 확인해 주세요');
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- 메모 ---------- */
  function orderedMemos() {
    const base = [...memos].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)); // 고정 메모 먼저, 나머지는 파일 순서
    if (!Array.isArray(memoOrder)) return base;
    const byId = new Map(base.map(m => [m.id, m]));
    const out = memoOrder.filter(id => byId.has(id)).map(id => byId.get(id));
    base.forEach(m => { if (!memoOrder.includes(m.id)) out.push(m); }); // 새로 추가된 메모는 뒤에
    return out;
  }
  const memoColor = m => MEMO_COLORS.includes(m.color) ? m.color : 'lemon';
  const visibleMemos = () => orderedMemos().filter(m => !memoHidden.includes(m.id));

  function pageHTML(m, peek) {
    const head = `<span class="mark" style="background:var(--memo-${memoColor(m)})"></span>` +
      (m.title ? `<h3>${m.pinned ? icon('pin') : ''}${esc(m.title)}</h3>` : '') + `<p>${esc(m.body)}</p>`;
    if (peek) return `<article class="page" data-go="memo">${head}</article>`;
    return `<article class="page" data-id="${esc(m.id)}">${head}<div class="acts">` +
      `<button class="page-btn" data-act="copy" aria-label="${esc(m.title || '메모')} 내용 복사">${icon('copy')}복사</button>` +
      `<button class="page-btn" data-act="hide" aria-label="${esc(m.title || '메모')} 숨기기">${icon('eye-off')}숨기기</button>` +
      `<span class="page-grip" aria-hidden="true">${icon('grip')}끌어서 이동</span></div></article>`;
  }

  function renderMemos() {
    const vis = visibleMemos();
    const hid = orderedMemos().filter(m => memoHidden.includes(m.id));
    $('#memo-n').textContent = vis.length;
    $('#hidden-n').textContent = hid.length;
    $('#hidden-wrap').hidden = hid.length === 0;
    if (!hid.length) setHiddenPanel(false);
    $('#hidden-list').innerHTML = hid.map(m =>
      `<li><span class="hm-dot" style="background:var(--memo-${memoColor(m)})"></span><span class="hm-txt"><b>${esc(m.title || '(제목 없음)')}</b><small>${esc(String(m.body || '').split('\n')[0])}</small></span>` +
      `<button class="hm-show" data-id="${esc(m.id)}">${icon('eye')}다시 보이기</button></li>`).join('');
    $('#board').innerHTML = vis.length ? vis.map(m => pageHTML(m, false)).join('') : '<p class="empty" style="grid-column:1/-1">보이는 메모가 없어요</p>';
    $('#home-memos').innerHTML = vis.slice(0, 2).map(m => pageHTML(m, true)).join('') || '<p class="empty" style="grid-column:1/-1">메모가 없어요</p>';
  }

  function setHiddenPanel(open) {
    $('#hidden-memos').hidden = !open;
    $('#btn-hidden').classList.toggle('on', open);
    $('#btn-hidden').setAttribute('aria-expanded', open);
  }

  function saveBoardOrder() {
    const shown = $$('#board .page').map(p => p.dataset.id);
    const rest = orderedMemos().map(m => m.id).filter(id => !shown.includes(id));
    memoOrder = [...shown, ...rest];
    tripSet('memoOrder', memoOrder);
    $('#home-memos').innerHTML = visibleMemos().slice(0, 2).map(m => pageHTML(m, true)).join('');
  }

  let sortable = null;
  async function setReorder(on) {
    const btn = $('#btn-reorder'), board = $('#board');
    if (on) {
      try { await loadScript(CDN.sortable); } catch (e) { toast('순서 변경 기능을 불러오지 못했어요'); return; }
      sortable = Sortable.create(board, { animation: 150, ghostClass: 'ghost', draggable: '.page', onEnd: saveBoardOrder });
    } else if (sortable) {
      sortable.destroy(); sortable = null;
    }
    board.classList.toggle('editing', on);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
    $('span', btn).textContent = on ? '변경 완료' : '순서 변경';
  }

  /* ---------- 포즈 레퍼런스 ---------- */
  const isFav = r => refFav.includes(r.id);
  const inCat = (r, c) => r.cats.includes(c);
  // 분류 → 즐겨찾기만 보기 순으로 거르고, 즐겨찾기를 맨 위로 (그 안에서는 파일 순서 유지)
  const shownRefs = () => {
    let list = refCat === 'all' ? refs : refs.filter(r => inCat(r, refCat));
    if ($('#fav-only').checked) list = list.filter(isFav);
    return [...list.filter(isFav), ...list.filter(r => !isFav(r))];
  };

  function renderRefs() {
    $('#ref-tabs').innerHTML = [{ key: 'all', label: '전체', n: refs.length }, ...REF_CATS.map(c => ({ key: c, label: c, n: refs.filter(r => inCat(r, c)).length }))]
      .map(t => `<button role="tab" data-cat="${esc(t.key)}" aria-selected="${t.key === refCat}" class="${t.key === refCat ? 'on' : ''}">${esc(t.label)}<em class="num">${t.n}</em></button>`).join('');
    $('#fav-n').textContent = refs.filter(isFav).length;
    const list = shownRefs();
    $('#album').innerHTML = list.length ? list.map((r, i) => {
      const name = r.title || '포즈 사진 ' + (i + 1);
      return `<div class="shot" data-id="${esc(r.id)}">` +
        `<button class="shot-open" data-i="${i}" aria-label="${esc(name)} 크게 보기"><img src="${esc(photoUrl(r.photo))}" alt="" loading="lazy" decoding="async"></button>` +
        (r.title ? `<span>${esc(r.title)}</span>` : '') +
        `<button class="fav" aria-label="${esc(name)} 즐겨찾기" aria-pressed="${isFav(r)}">${icon('star')}</button></div>`;
    }).join('')
      : `<p class="empty">${$('#fav-only').checked ? '즐겨찾기한 사진이 없어요' : '아직 사진이 없어요'}</p>`;
  }

  function toggleFav(id) {
    const on = !refFav.includes(id);
    refFav = on ? [...refFav, id] : refFav.filter(x => x !== id);
    saved.set('refFav', refFav);
    renderRefs();
    toast(on ? '즐겨찾기에 추가했어요' : '즐겨찾기를 해제했어요');
    return on;
  }

  /* ---------- 사진 크게 보기 ---------- */
  // gallery: 좌우로 넘겨 볼 레퍼런스 목록 (쇼핑 사진은 한 장씩만)
  let gallery = null, galleryAt = 0;
  function openViewer(src) {
    gallery = null;
    showViewer(src, '');
    syncViewerFav();
  }
  function openGallery(list, i) {
    gallery = list; galleryAt = i;
    stepGallery(0);
  }
  function stepGallery(d) {
    if (!gallery || !gallery.length) return;
    galleryAt = (galleryAt + d + gallery.length) % gallery.length;
    const r = gallery[galleryAt];
    const cap = (r.title ? esc(r.title) : '') + (r.note ? `<small>${esc(r.note)}</small>` : '');
    showViewer(photoUrl(r.photo), cap);
    syncViewerFav();
  }
  function syncViewerFav() {
    const b = $('#viewer .v-fav');
    b.hidden = !gallery;
    if (gallery) b.setAttribute('aria-pressed', isFav(gallery[galleryAt]));
  }
  function showViewer(src, capHTML) {
    const v = $('#viewer'), multi = !!gallery && gallery.length > 1;
    $('img', v).src = src;
    $('.v-cap', v).innerHTML = capHTML;
    $('.v-cap', v).hidden = !capHTML;
    $$('.v-nav', v).forEach(b => { b.hidden = !multi; });
    if (v.hidden) { v.hidden = false; $('.v-close', v).focus(); }
  }
  function closeViewer() { $('#viewer').hidden = true; $('#viewer img').removeAttribute('src'); gallery = null; }

  /* ---------- 다시 그리기 ---------- */
  function renderAllPrices() {
    renderHomeCalc(); renderHomeBrands(); renderRateCalc(); renderShop();
  }

  /* ---------- 이벤트 ---------- */
  function bind() {
    document.addEventListener('click', e => {
      const pick = e.target.closest('.trip-pick');
      if (pick) return openTripSheet(pick);
      const go = e.target.closest('[data-tab],[data-go]');
      if (go && go.dataset.store) { shopStore = go.dataset.store; renderShop(); }
      if (go) show(go.dataset.tab || go.dataset.go);
    });
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));

    $('#home-price').addEventListener('input', renderHomeCalc);
    $('#price').addEventListener('input', renderRateCalc);
    $('#rate').addEventListener('input', onRateInput);
    $('#rate').addEventListener('keydown', e => { if (e.key === 'Enter') saveRate(); });
    $('#rate-save').addEventListener('click', saveRate);

    $('#store-tabs').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      shopStore = b.dataset.store;
      $$('#store-tabs button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      applyShop();
    });
    $('#todo-only').addEventListener('change', applyShop);
    $('#price-mode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setPriceMode(b.dataset.mode); });

    $('#receipts').addEventListener('click', async e => {
      const ln = e.target.closest('.ln'); if (!ln) return;
      if (e.target.closest('.box')) return togglePurchase(ln);
      const cp = e.target.closest('.cp');
      if (cp) {
        const ok = await copyText(cp.dataset.copy);
        toast(ok ? '복사했어요' : '복사하지 못했어요');
        if (ok) {
          cp.classList.add('ok'); $('use', cp).setAttribute('href', '#check');
          setTimeout(() => { cp.classList.remove('ok'); $('use', cp).setAttribute('href', '#copy'); }, 1200);
        }
        return;
      }
      const ph = e.target.closest('.ph'); if (ph) return openViewer(ph.dataset.src);
      if (e.target.closest('button.t')) setOpen(ln, !ln.classList.contains('open'));
    });
    $('#btn-xlsx').addEventListener('click', downloadXlsx);
    $$('.to-top').forEach(b => b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })));

    $('#btn-hidden').addEventListener('click', () => setHiddenPanel($('#hidden-memos').hidden));
    $('#hidden-list').addEventListener('click', e => {
      const b = e.target.closest('.hm-show'); if (!b) return;
      memoHidden = memoHidden.filter(id => id !== b.dataset.id);
      tripSet('memoHidden', memoHidden);
      renderMemos();
    });
    $('#board').addEventListener('click', async e => {
      const b = e.target.closest('.page-btn'); if (!b) return;
      const m = memos.find(x => x.id === b.closest('.page').dataset.id); if (!m) return;
      if (b.dataset.act === 'hide') {
        memoHidden = [...memoHidden, m.id];
        tripSet('memoHidden', memoHidden);
        renderMemos();
        toast('메모를 숨겼어요');
      } else {
        const ok = await copyText(m.body || '');
        toast(ok ? '메모를 복사했어요' : '복사하지 못했어요');
      }
    });
    $('#btn-reorder').addEventListener('click', () => setReorder(!$('#board').classList.contains('editing')));

    $('#trip-sheet').addEventListener('click', e => {
      const b = e.target.closest('[data-trip]');
      if (b) {
        const changed = b.dataset.trip !== tripId;
        closeTripSheet();
        if (changed) { loadTrip(b.dataset.trip); window.scrollTo(0, 0); toast(`${trip.name} 여행으로 바꿨어요`); }
        return;
      }
      if (!e.target.closest('.sheet-panel')) closeTripSheet(); // 바깥 어두운 곳 누르면 닫기
    });

    $('#ref-tabs').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      refCat = b.dataset.cat;
      renderRefs();
    });
    $('#fav-only').addEventListener('change', renderRefs);
    $('#album').addEventListener('click', e => {
      const f = e.target.closest('.fav');
      if (f) {
        const id = f.closest('.shot').dataset.id;
        toggleFav(id);
        const nb = $(`#album .shot[data-id="${CSS.escape(id)}"] .fav`); // 다시 그려진 별에 톡 효과
        if (nb) nb.classList.add('pop');
        return;
      }
      const b = e.target.closest('.shot-open'); if (b) openGallery(shownRefs(), Number(b.dataset.i));
    });

    $('#viewer').addEventListener('click', e => {
      const fb = e.target.closest('.v-fav');
      if (fb) {
        // 넘겨 보던 순서는 그대로 두고 별만 바꿈 (뒤쪽 사진첩은 바로 다시 정렬)
        fb.setAttribute('aria-pressed', toggleFav(gallery[galleryAt].id));
        fb.classList.remove('pop'); void fb.offsetWidth; fb.classList.add('pop');
        return;
      }
      const nav = e.target.closest('.v-nav');
      if (nav) return stepGallery(nav.classList.contains('v-prev') ? -1 : 1);
      if (gallery && e.target.closest('img')) return; // 레퍼런스는 사진을 눌러도 닫히지 않게 (넘기다 실수로 닫힘 방지)
      closeViewer();
    });
    // 레퍼런스는 좌우로 밀어서 넘기기
    let touchX = null;
    $('#viewer').addEventListener('touchstart', e => { touchX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    $('#viewer').addEventListener('touchend', e => {
      if (touchX == null || !gallery) return;
      const dx = e.changedTouches[0].clientX - touchX; touchX = null;
      if (Math.abs(dx) > 50) stepGallery(dx < 0 ? 1 : -1);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#trip-sheet').hidden) return closeTripSheet();
      if ($('#viewer').hidden) return;
      if (e.key === 'Escape') closeViewer();
      else if (e.key === 'ArrowLeft') stepGallery(-1);
      else if (e.key === 'ArrowRight') stepGallery(1);
    });
  }

  /* ---------- 시작 ---------- */
  // data/*.js 가 window.TRIPS / SHOPPING / MEMOS / REFS 에 넣어 둔 값을 읽음.
  // 파일에 쉼표·따옴표 실수가 있으면 그 파일 값이 비어서 아래 안내가 뜸
  const missing = [['trip.js', window.TRIPS || window.TRIP], ['shopping.js', window.SHOPPING], ['memos.js', window.MEMOS], ['refs.js', window.REFS]]
    .filter(([, v]) => v == null).map(([f]) => 'data/' + f);
  if (missing.length) {
    $('#loading').outerHTML = `<div class="load-err"><b>데이터를 불러오지 못했어요</b>${esc(missing.join(', '))} 파일에<br>쉼표·따옴표·괄호가 빠지지 않았는지 확인해 주세요.</div>`;
    return;
  }
  // 예전 trip.js(window.TRIP 하나)도 그대로 읽히게
  trips = (Array.isArray(window.TRIPS) ? window.TRIPS : [{ id: 'trip', ...window.TRIP }])
    .filter(t => t && t.id).map(t => ({ ...t, id: String(t.id) }));
  if (!trips.length) trips = [{ id: 'trip', name: '' }];
  // id 를 안 적은 사진은 파일 이름을 id 로 (즐겨찾기 저장용)
  // category 는 "솔로" 하나 또는 ["커플", "실내"] 처럼 여러 개 → cats 배열로 통일
  refs = (Array.isArray(window.REFS) ? window.REFS : []).filter(r => r && r.photo)
    .map(r => ({ ...r, id: String(r.id || r.photo), cats: [].concat(r.category || []).map(String) }));

  setPriceMode(priceMode);
  loadTrip(saved.get('trip', null));
  renderRefs();
  bind();
  $('#loading').remove();
  show(location.hash.slice(1));
})();
