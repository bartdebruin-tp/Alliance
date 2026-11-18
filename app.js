(() => {
  'use strict';

  const SIZE = 20;
  const LETTERS = 'ABCDEFGHIJKLMNOPQRST';
  const STORE_KEY = 'alliance-map-v1';
  const COLORS = ['#e4572e', '#f3a712', '#29a36a', '#2e86de', '#8e44ad', '#e84393', '#16a5a5', '#6d4c41'];
  const MIN_CELL = 24, MAX_CELL = 72, CELL_STEP = 8;
  const MAX_HISTORY = 100;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  // ---------- State ----------
  // players: [{ id, name, color, photo (data URL or null), pos ({r, c} or null) }]
  // history: [{ id, from }] for undo
  let state = load();
  let selectedId = null;

  function defaultState() { return { players: [], history: [], cell: 40 }; }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* storage unavailable: start fresh */ }
    return defaultState();
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { flash('Could not save — phone storage is full or blocked.'); }
  }

  const findPlayer = (id) => state.players.find((p) => p.id === id) || null;
  const selected = () => findPlayer(selectedId);
  const coord = (pos) => LETTERS[pos.c] + (pos.r + 1);
  const initial = (name) => (name.trim()[0] || '?').toUpperCase();
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- Board ----------
  const board = $('#board');
  const mapWrap = $('#mapWrap');
  const cells = [];

  function buildBoard() {
    board.appendChild(el('div', 'label corner'));
    for (let c = 0; c < SIZE; c++) {
      const d = el('div', 'label col');
      d.textContent = LETTERS[c];
      board.appendChild(d);
    }
    for (let r = 0; r < SIZE; r++) {
      const rl = el('div', 'label row');
      rl.textContent = r + 1;
      board.appendChild(rl);
      for (let c = 0; c < SIZE; c++) {
        const cell = el('div', 'cell');
        if ((r + c) % 2) cell.classList.add('alt');
        if (r === 0) cell.classList.add('first-row');
        if (c === 0) cell.classList.add('first-col');
        cell.dataset.r = r;
        cell.dataset.c = c;
        board.appendChild(cell);
        cells.push(cell);
      }
    }
    board.addEventListener('click', onBoardClick);
  }

  function makeToken(p, showSelected) {
    const t = el('div', 'token');
    if (showSelected && p.id === selectedId) t.classList.add('selected');
    t.dataset.id = p.id;
    t.style.setProperty('--pc', p.color);
    if (p.photo) t.style.backgroundImage = `url("${p.photo}")`;
    else t.textContent = initial(p.name);
    t.title = p.name;
    return t;
  }

  function onBoardClick(e) {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const pos = { r: +cell.dataset.r, c: +cell.dataset.c };
    const sel = selected();

    if (sel) {
      if (sel.pos && sel.pos.r === pos.r && sel.pos.c === pos.c) { select(null); return; }
      moveTo(sel, pos);
      select(null);
      return;
    }

    const tapped = e.target.closest('.token') || cell.querySelector('.token');
    if (tapped) select(tapped.dataset.id);
  }

  function moveTo(p, pos) {
    state.history.push({ id: p.id, from: p.pos ? { ...p.pos } : null });
    if (state.history.length > MAX_HISTORY) state.history.shift();
    p.pos = pos;
    save();
  }

  function undo() {
    while (state.history.length) {
      const h = state.history.pop();
      const p = findPlayer(h.id);
      if (p) { p.pos = h.from; break; }
    }
    save();
    select(null);
  }

  // ---------- Rendering ----------
  function render() {
    document.documentElement.style.setProperty('--cell', state.cell + 'px');

    for (const cell of cells) { cell.textContent = ''; cell.classList.remove('multi'); }
    const byCell = new Map();
    for (const p of state.players) {
      if (!p.pos) continue;
      const k = p.pos.r * SIZE + p.pos.c;
      if (!byCell.has(k)) byCell.set(k, []);
      byCell.get(k).push(p);
    }
    for (const [k, list] of byCell) {
      if (list.length > 1) cells[k].classList.add('multi');
      for (const p of list) cells[k].appendChild(makeToken(p, true));
    }

    mapWrap.classList.toggle('placing', !!selectedId);
    $('#undoBtn').disabled = state.history.length === 0;
    $('#zoomIn').disabled = state.cell >= MAX_CELL;
    $('#zoomOut').disabled = state.cell <= MIN_CELL;
    renderPlayers();
    renderStatus();
  }

  function renderPlayers() {
    const list = $('#playerList');
    list.textContent = '';
    for (const p of state.players) {
      const b = el('button', 'chip');
      b.type = 'button';
      if (p.id === selectedId) b.classList.add('selected');
      b.appendChild(makeToken(p, false));
      const name = el('span', 'chip-name'); name.textContent = p.name; b.appendChild(name);
      const pos = el('span', 'chip-pos'); pos.textContent = p.pos ? coord(p.pos) : 'not placed'; b.appendChild(pos);
      b.addEventListener('click', () => select(p.id === selectedId ? null : p.id, true));
      list.appendChild(b);
    }
    const add = el('button', 'chip add');
    add.type = 'button';
    const plus = el('span', 'plus'); plus.textContent = '+'; add.appendChild(plus);
    const label = el('span', 'chip-name'); label.textContent = 'Add player'; add.appendChild(label);
    add.addEventListener('click', () => openPlayerDialog(null));
    list.appendChild(add);
  }

  let flashTimer = null;
  function renderStatus() {
    if (flashTimer) return;
    const p = selected();
    const text = $('#statusText');
    $('#selActions').hidden = !p;
    if (!p) {
      text.textContent = state.players.length ? 'Tap a player to move them' : 'Add a player to get started';
      return;
    }
    text.textContent = p.pos ? `Tap a square to move ${p.name}` : `Tap a square to place ${p.name}`;
    $('#offBtn').hidden = !p.pos;
  }

  function flash(msg) {
    clearTimeout(flashTimer);
    $('#statusText').textContent = msg;
    flashTimer = setTimeout(() => { flashTimer = null; renderStatus(); }, 3000);
  }

  function select(id, scroll) {
    selectedId = id;
    render();
    const p = selected();
    if (scroll && p && p.pos) {
      cells[p.pos.r * SIZE + p.pos.c].scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }
  }

  // ---------- Zoom ----------
  function zoom(dir) {
    const next = Math.min(MAX_CELL, Math.max(MIN_CELL, state.cell + dir * CELL_STEP));
    if (next === state.cell) return;
    const ratio = next / state.cell;
    const cx = mapWrap.scrollLeft + mapWrap.clientWidth / 2;
    const cy = mapWrap.scrollTop + mapWrap.clientHeight / 2;
    state.cell = next;
    save();
    render();
    mapWrap.scrollLeft = cx * ratio - mapWrap.clientWidth / 2;
    mapWrap.scrollTop = cy * ratio - mapWrap.clientHeight / 2;
  }

  // ---------- Player dialog ----------
  const dlg = $('#playerDialog');
  let draft = null;

  function nextColor() {
    const used = new Set(state.players.map((p) => p.color));
    return COLORS.find((c) => !used.has(c)) || COLORS[state.players.length % COLORS.length];
  }

  function openPlayerDialog(p) {
    draft = p
      ? { id: p.id, name: p.name, color: p.color, photo: p.photo }
      : { id: null, name: '', color: nextColor(), photo: null };
    $('#dlgTitle').textContent = p ? 'Edit player' : 'Add player';
    $('#deletePlayer').hidden = !p;
    $('#nameInput').value = draft.name;
    renderColorPicker();
    renderPreview();
    dlg.showModal();
    if (!p) $('#nameInput').focus();
  }

  function renderColorPicker() {
    const box = $('#colorPicker');
    box.textContent = '';
    for (const c of COLORS) {
      const s = el('button', 'swatch');
      s.type = 'button';
      s.style.setProperty('--sw', c);
      s.setAttribute('aria-label', 'Colour ' + c);
      s.setAttribute('aria-pressed', String(c === draft.color));
      s.addEventListener('click', () => { draft.color = c; renderColorPicker(); renderPreview(); });
      box.appendChild(s);
    }
  }

  function renderPreview() {
    const prev = $('#photoPreview');
    prev.style.setProperty('--pc', draft.color);
    prev.style.backgroundImage = draft.photo ? `url("${draft.photo}")` : '';
    prev.textContent = draft.photo ? '' : initial($('#nameInput').value || '?');
    $('#removePhoto').hidden = !draft.photo;
  }

  // Crop to a square and shrink, so photos stay small enough to store on the phone.
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const S = 192;
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = S;
        canvas.getContext('2d').drawImage(
          img,
          (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
          0, 0, S, S
        );
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  $('#photoInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      draft.photo = await resizeImage(file);
      renderPreview();
    } catch (err) {
      alert('That image could not be used. Try another photo.');
    }
  });

  $('#removePhoto').addEventListener('click', () => { draft.photo = null; renderPreview(); });
  $('#nameInput').addEventListener('input', renderPreview);
  $('#cancelDlg').addEventListener('click', () => dlg.close());

  $('#playerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#nameInput').value.trim();
    if (!name) { $('#nameInput').focus(); return; }
    if (draft.id) {
      Object.assign(findPlayer(draft.id), { name, color: draft.color, photo: draft.photo });
    } else {
      const p = { id: newId(), name, color: draft.color, photo: draft.photo, pos: null };
      state.players.push(p);
      selectedId = p.id; // ready to be placed on the map
    }
    save();
    dlg.close();
    render();
  });

  $('#deletePlayer').addEventListener('click', () => {
    const p = findPlayer(draft.id);
    if (!p || !confirm(`Delete ${p.name}?`)) return;
    state.players = state.players.filter((x) => x.id !== p.id);
    state.history = state.history.filter((h) => h.id !== p.id);
    if (selectedId === p.id) selectedId = null;
    save();
    dlg.close();
    render();
  });

  // ---------- Menu ----------
  const menu = $('#menuDialog');
  $('#menuBtn').addEventListener('click', () => menu.showModal());
  $('#closeMenu').addEventListener('click', () => menu.close());
  $('#clearMap').addEventListener('click', () => {
    if (!confirm('Take every player off the map?')) return;
    state.players.forEach((p) => { p.pos = null; });
    state.history = [];
    save();
    menu.close();
    select(null);
  });
  $('#newGame').addEventListener('click', () => {
    if (!confirm('Start a new game? This deletes all players and their photos.')) return;
    state = Object.assign(defaultState(), { cell: state.cell });
    save();
    menu.close();
    select(null);
  });

  // ---------- Toolbar & selection actions ----------
  $('#undoBtn').addEventListener('click', undo);
  $('#zoomIn').addEventListener('click', () => zoom(1));
  $('#zoomOut').addEventListener('click', () => zoom(-1));
  $('#editBtn').addEventListener('click', () => { const p = selected(); if (p) openPlayerDialog(p); });
  $('#offBtn').addEventListener('click', () => {
    const p = selected();
    if (!p || !p.pos) return;
    moveTo(p, null);
    select(null);
  });

  buildBoard();
  render();
})();
