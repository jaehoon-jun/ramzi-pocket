'use strict';
// 람지의 여행수첩
// - 여행·상품·메모는 data/*.js 에서 읽어온다 (두 사람 폰에 똑같이 보임)
// - 환율 고정값, 구매 체크, 가격 표시 방식, 메모 숨김·순서는 이 폰의 localStorage 에만 저장된다
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
  const STORE_TONES = [['--memo-peach', '--wine'], ['--gold-bg', '--gold-ink'], ['--memo-mint', '#3F5A44'], ['--memo-lavender', '#56466A'], ['--memo-sky', '#3E5A66']];
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

  let trip, items, memos;
  let rate = null;
  let purchased = saved.get('purchased', {});
  let priceMode = saved.get('priceMode', 'krw');
  let memoHidden = saved.get('memoHidden', []);
  let memoOrder = saved.get('memoOrder', null);
  let shopStore = 'all';

  // 원화 = 현지 가격 × 고정값, 소수점 이하 버림 (부동소수 오차로 9114.9999… 처럼 되는 것 방지)
  const toKrw = local => (rate > 0 && Number.isFinite(local)) ? Math.floor(local * rate + 1e-9) : null;
  const krwText = local => { const v = toKrw(local); return v == null ? '-' : fmt(v); };
  const isDone = it => !!purchased[it.id];
  const hasLocal = it => typeof it.localPrice === 'number' && Number.isFinite(it.localPrice); // 현지 가격을 아직 모르면 null

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
  const TABS = ['home', 'rate', 'shop', 'memo'];
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

  /* ---------- 헤더 ---------- */
  function renderHeaders() {
    const date = [trip.start, trip.end].filter(Boolean).join(' — ') + (trip.purpose ? ' · ' + trip.purpose : '');
    $$('.trip-h').forEach(h => {
      h.innerHTML = `<span class="trip-name">${esc(trip.name)}</span><span class="trip-date num">${esc(date)}</span>`;
    });
    document.title = 'Ramzi-Pocket';
  }

  /* ---------- 홈 ---------- */
  function storeTone(store) {
    const stores = [...new Set(items.map(it => it.store))];
    const [bg, fg] = STORE_TONES[Math.max(0, stores.indexOf(store)) % STORE_TONES.length];
    const v = c => c.startsWith('--') ? `var(${c})` : c;
    return `background:${v(bg)};color:${v(fg)}`;
  }

  function renderHomeCalc() {
    const v = parseNum($('#home-price').value);
    $('#home-krw').textContent = Number.isNaN(v) ? '0' : krwText(v);
  }

  function renderHomeTodo() {
    const todo = items.filter(it => !isDone(it));
    $('#home-todo-n').textContent = pad2(todo.length);
    $('#home-todo').innerHTML = todo.length ? todo.slice(0, 3).map(it => {
      const sub = [it.store, it.color, it.size].filter(Boolean).join(' · ');
      return `<li data-go="shop"><span class="av" style="${storeTone(it.store)}">${esc(String(it.store).trim().charAt(0))}</span>` +
        `<span class="tx"><b>${esc(it.name)}</b><small>${esc(sub)}</small></span>` +
        `<span class="pr num">${toKrw(it.localPrice) == null ? '<span>가격 미정</span>' : krwText(it.localPrice) + '<span>원</span>'}</span></li>`;
    }).join('') : '<li class="empty" data-go="shop" style="justify-content:center;border:0">살 건 다 샀어요</li>';
  }

  /* ---------- 환율 ---------- */
  const STEPS = [100, 300, 500, 1000, 2000, 3000, 5000];
  function renderRateCalc() {
    const v = parseNum($('#price').value);
    $('#rc-krw').textContent = Number.isNaN(v) ? '0' : krwText(v);
    $('#rc-x').textContent = rate > 0 ? '× ' + rate : '× -';
    const near = Number.isNaN(v) ? null : STEPS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
    $('#rc-tbl').innerHTML = STEPS.map(s =>
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

  function saveRate() {
    const raw = $('#rate').value.trim();
    const v = parseFloat(raw.replace(/,/g, ''));
    if (!raw || !/^[0-9.,]+$/.test(raw) || !(v > 0)) {
      $('#rc-fix').classList.add('err');
      const msg = $('#rate-msg');
      msg.classList.add('err');
      msg.textContent = '0보다 큰 숫자만 저장할 수 있어요 (예: 8.5)';
      return;
    }
    rate = v;
    saved.set('rate', { value: v, savedAt: new Date().toISOString() });
    $('#rate').value = String(v);
    syncRateInput();
    renderAllPrices();
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
      return `<section class="paper r-group" data-store="${esc(g.store)}">` +
        `<header class="rh">${g.en ? `<small>${esc(g.en)}</small>` : ''}<h3>${esc(g.store)}</h3></header>` +
        g.items.map(lineHTML).join('') +
        `<div class="rf num"><span>${g.items.length}개 소계</span><b><span class="p-krw">${rate > 0 && anyLocal ? fmt(sumKrw) + '원' : '-'}</span><span class="p-loc">${anyLocal ? fmt(sumLoc) : '-'}</span></b></div>` +
        `</section>`;
    }).join('') + '<p class="r-empty" hidden>여기서 살 건 다 샀어요</p>';
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
    const save = bought.reduce((s, it) => {
      const k = toKrw(it.localPrice);
      return (it.krPrice == null || k == null) ? s : s + Math.max(0, it.krPrice - k);
    }, 0);
    $('#sum-cnt').textContent = `${bought.length} / ${items.length}개`;
    $('#sum-paid').textContent = rate > 0 ? fmt(paid) + '원' : '-';
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
    saved.set('purchased', purchased);
    ln.classList.toggle('done', on);
    $('.box', ln).setAttribute('aria-pressed', on);
    ln.classList.remove('pop'); void ln.offsetWidth; ln.classList.add('pop');
    applyShop(); renderSums(); renderHomeTodo();
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
      XLSX.writeFile(wb, `Ramzi-Pocket_쇼핑리스트_${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}.xlsx`);
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
    saved.set('memoOrder', memoOrder);
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

  /* ---------- 사진 크게 보기 ---------- */
  function openViewer(src) {
    const v = $('#viewer');
    $('img', v).src = src;
    v.hidden = false;
    $('button', v).focus();
  }
  function closeViewer() { $('#viewer').hidden = true; $('#viewer img').removeAttribute('src'); }

  /* ---------- 다시 그리기 ---------- */
  function renderAllPrices() {
    renderHomeCalc(); renderHomeTodo(); renderRateCalc(); renderShop();
  }

  /* ---------- 이벤트 ---------- */
  function bind() {
    document.addEventListener('click', e => {
      const go = e.target.closest('[data-tab],[data-go]');
      if (go) show(go.dataset.tab || go.dataset.go);
    });
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));

    $('#home-price').addEventListener('input', renderHomeCalc);
    $('#price').addEventListener('input', renderRateCalc);
    $('#rate').addEventListener('input', syncRateInput);
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
      saved.set('memoHidden', memoHidden);
      renderMemos();
    });
    $('#board').addEventListener('click', async e => {
      const b = e.target.closest('.page-btn'); if (!b) return;
      const m = memos.find(x => x.id === b.closest('.page').dataset.id); if (!m) return;
      if (b.dataset.act === 'hide') {
        memoHidden = [...memoHidden, m.id];
        saved.set('memoHidden', memoHidden);
        renderMemos();
        toast('메모를 숨겼어요');
      } else {
        const ok = await copyText(m.body || '');
        toast(ok ? '메모를 복사했어요' : '복사하지 못했어요');
      }
    });
    $('#btn-reorder').addEventListener('click', () => setReorder(!$('#board').classList.contains('editing')));

    $('#viewer').addEventListener('click', closeViewer);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#viewer').hidden) closeViewer(); });
  }

  /* ---------- 시작 ---------- */
  // data/*.js 가 window.TRIP / SHOPPING / MEMOS 에 넣어 둔 값을 읽음.
  // 파일에 쉼표·따옴표 실수가 있으면 그 파일 값이 비어서 아래 안내가 뜸
  const missing = [['trip.js', window.TRIP], ['shopping.js', window.SHOPPING], ['memos.js', window.MEMOS]]
    .filter(([, v]) => v == null).map(([f]) => 'data/' + f);
  if (missing.length) {
    $('#loading').outerHTML = `<div class="load-err"><b>데이터를 불러오지 못했어요</b>${esc(missing.join(', '))} 파일에<br>쉼표·따옴표·괄호가 빠지지 않았는지 확인해 주세요.</div>`;
    return;
  }
  trip = window.TRIP || {};
  items = Array.isArray(window.SHOPPING) ? window.SHOPPING : [];
  memos = Array.isArray(window.MEMOS) ? window.MEMOS : [];
  const r = saved.get('rate', null);
  rate = r && r.value > 0 ? Number(r.value) : (Number(trip.defaultRate) > 0 ? Number(trip.defaultRate) : null);
  $('#rate').value = rate > 0 ? String(rate) : '';

  renderHeaders();
  syncRateInput();
  setPriceMode(priceMode);
  renderAllPrices();
  renderMemos();
  bind();
  $('#loading').remove();
  show(location.hash.slice(1));
})();
