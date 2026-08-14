/* ---------------- CLOCK + DATE LINE ---------------- */

function pad(n) { return String(n).padStart(2, '0'); }

function updateClock() {
  const now = new Date();
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  document.getElementById('clock-time').innerHTML =
    `${h}<span class="cursor">:</span>${m}<span class="cursor">:</span>${s}`;

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  document.getElementById('gitline').textContent = dateStr;

  const hour = now.getHours();
  const greeting = document.getElementById('greeting');
  if (hour < 5) greeting.textContent = '// still up? get some rest, developer';
  else if (hour < 12) greeting.textContent = '// good morning, developer';
  else if (hour < 18) greeting.textContent = '// good afternoon, developer';
  else greeting.textContent = '// good evening, developer';
}
updateClock();
setInterval(updateClock, 1000);

const QUOTES = [
  'code never lies, comments sometimes do',
  'ship small, ship often',
  'commit early, commit often',
  'there are only two hard things in computer science',
  'make it work, make it right, make it fast',
  'the best code is no code at all',
  'today\'s bug is tomorrow\'s war story'
];
document.getElementById('quote').textContent = '// ' + QUOTES[Math.floor(Math.random() * QUOTES.length)];


/* ---------------- SEARCH BAR ---------------- */

document.getElementById('searchbar').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('search-input');
  const query = input.value.trim();
  if (!query) return;
  // if it looks like a URL, go straight there; otherwise search Google
  const isUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+.*$/i.test(query) && !query.includes(' ');
  const dest = isUrl ? normalizeUrl(query) : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  window.location.href = dest;
});


/* ---------------- STORAGE HELPERS ----------------
   Uses chrome.storage.local instead of window.localStorage.
   Why: Chrome pre-renders/caches New Tab page instances in the
   background for speed. A page opened earlier can keep showing
   stale data even after you've made changes elsewhere. chrome.storage
   fixes this two ways: (1) it's the same store shared by every open
   instance of this page, and (2) chrome.storage.onChanged fires a
   live event in every open tab whenever data changes, so all open
   tabs immediately re-render with the latest data — no stale caches,
   no reload needed. Falls back to localStorage if chrome.storage is
   ever unavailable (e.g. testing the raw HTML file outside Chrome). */

const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

function storageGet(keys) {
  if (hasChromeStorage) {
    return new Promise(resolve => chrome.storage.local.get(keys, resolve));
  }
  const result = {};
  Object.keys(keys).forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      result[k] = raw ? JSON.parse(raw) : keys[k];
    } catch (e) {
      result[k] = keys[k];
    }
  });
  return Promise.resolve(result);
}

function storageSet(key, value) {
  if (hasChromeStorage) {
    chrome.storage.local.set({ [key]: value });
  } else {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


/* ---------------- STATE ---------------- */

let todos = [];
let notes = [];
let links = [];

const NOTE_COLORS = ['yellow', 'pink', 'green', 'blue'];
const MAX_NOTES = 4;

function backfillNoteColors() {
  notes.forEach((note, i) => {
    if (!note.color) note.color = NOTE_COLORS[i % NOTE_COLORS.length];
  });
}


/* ---------------- TODO LIST ---------------- */

function renderTodos() {
  const list = document.getElementById('todo-list');
  list.innerHTML = '';

  if (todos.length === 0) {
    const hint = document.createElement('li');
    hint.className = 'empty-hint';
    hint.textContent = 'no tasks yet — add one above';
    list.appendChild(hint);
  }

  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.done ? ' done' : '');

    const box = document.createElement('span');
    box.className = 'box';
    box.addEventListener('click', () => {
      todo.done = !todo.done;
      storageSet('todos', todos);
      renderTodos();
    });

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = todo.text;

    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '✕';
    del.title = 'remove';
    del.addEventListener('click', () => {
      todos = todos.filter(t => t.id !== todo.id);
      storageSet('todos', todos);
      renderTodos();
    });

    li.append(box, label, del);
    list.appendChild(li);
  });

  const openCount = todos.filter(t => !t.done).length;
  document.getElementById('todo-count').textContent = `${openCount} open`;
}

document.getElementById('todo-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;
  todos.push({ id: uid(), text, done: false });
  storageSet('todos', todos);
  input.value = '';
  renderTodos();
});


/* ---------------- STICKY NOTES ---------------- */

function renderNotes() {
  const board = document.getElementById('notes-board');
  board.innerHTML = '';

  if (notes.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.textContent = 'no notes yet — add one above';
    board.appendChild(hint);
  }

  notes.forEach(note => {
    const div = document.createElement('div');
    div.className = 'note';
    div.dataset.color = note.color;

    const tape = document.createElement('div');
    tape.className = 'tape';

    const textarea = document.createElement('textarea');
    textarea.value = note.text;
    textarea.maxLength = 240;
    textarea.addEventListener('input', () => {
      note.text = textarea.value;
      storageSet('notes', notes);
    });

    const del = document.createElement('button');
    del.className = 'note-del';
    del.textContent = 'remove';
    del.addEventListener('click', () => {
      notes = notes.filter(n => n.id !== note.id);
      storageSet('notes', notes);
      renderNotes();
    });

    div.append(tape, textarea, del);
    board.appendChild(div);
  });

  const addBtn = document.getElementById('note-add');
  addBtn.disabled = notes.length >= MAX_NOTES;
  addBtn.title = notes.length >= MAX_NOTES ? `max ${MAX_NOTES} notes` : 'add note';
}

document.getElementById('note-add').addEventListener('click', () => {
  if (notes.length >= MAX_NOTES) return;
  const usedColors = notes.map(n => n.color);
  const nextColor = NOTE_COLORS.find(c => !usedColors.includes(c)) || NOTE_COLORS[notes.length % NOTE_COLORS.length];
  notes.push({ id: uid(), text: '', color: nextColor });
  storageSet('notes', notes);
  renderNotes();
});


/* ---------------- SHORTCUTS ---------------- */

function normalizeUrl(u) {
  if (!/^https?:\/\//i.test(u)) return 'https://' + u;
  return u;
}

function closeAllMenus() {
  document.querySelectorAll('.link-menu.show').forEach(m => m.classList.remove('show'));
  document.querySelectorAll('.menu-btn.open').forEach(b => b.classList.remove('open'));
}

/* ---- drag-to-reorder ---- */
let draggedTile = null;

function renderLinks() {
  const grid = document.getElementById('links-grid');
  grid.innerHTML = '';

  links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'link-tile';
    a.href = link.url;
    a.dataset.id = link.id;
    a.draggable = true;

    a.addEventListener('dragstart', (e) => {
      draggedTile = a;
      e.dataTransfer.effectAllowed = 'move';
      // Firefox requires data to be set for drag to start
      e.dataTransfer.setData('text/plain', link.id);
      closeAllMenus();
      // apply the visual state after the drag image is captured
      requestAnimationFrame(() => a.classList.add('dragging'));
    });

    a.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!draggedTile || draggedTile === a) return;
      const rect = a.getBoundingClientRect();
      const before = e.clientX - rect.left < rect.width / 2;
      grid.insertBefore(draggedTile, before ? a : a.nextSibling);
    });

    a.addEventListener('drop', (e) => {
      e.preventDefault();
    });

    a.addEventListener('dragend', () => {
      a.classList.remove('dragging');
      draggedTile = null;
      // persist whatever order is now in the DOM
      const newOrder = Array.from(grid.children)
        .map(el => links.find(l => l.id === el.dataset.id))
        .filter(Boolean);
      if (newOrder.length === links.length) {
        links = newOrder;
        storageSet('links', links);
      }
    });

    const dot = document.createElement('span');
    dot.className = 'dot';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = link.label;

    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-btn';
    menuBtn.textContent = '⋯';
    menuBtn.title = 'options';

    const menu = document.createElement('div');
    menu.className = 'link-menu';

    const editOpt = document.createElement('button');
    editOpt.className = 'edit-opt';
    editOpt.textContent = 'edit';

    const removeOpt = document.createElement('button');
    removeOpt.className = 'remove-opt';
    removeOpt.textContent = 'remove';

    menu.append(editOpt, removeOpt);

    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = menu.classList.contains('show');
      closeAllMenus();
      if (!isOpen) {
        menu.classList.add('show');
        menuBtn.classList.add('open');
      }
    });

    editOpt.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllMenus();
      openLinkModal('edit', link);
    });

    removeOpt.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllMenus();
      links = links.filter(l => l.id !== link.id);
      storageSet('links', links);
      renderLinks();
    });

    a.append(dot, label, menuBtn, menu);
    grid.appendChild(a);
  });
}

document.addEventListener('click', closeAllMenus);

const linksGrid = document.getElementById('links-grid');
linksGrid.addEventListener('dragover', (e) => e.preventDefault());
linksGrid.addEventListener('drop', (e) => e.preventDefault());

/* ---- add / edit modal ---- */

const linkModalOverlay = document.getElementById('link-modal-overlay');
const linkModalTitle = document.getElementById('link-modal-title');
const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput = document.getElementById('link-url-input');
const linkModalCancel = document.getElementById('link-modal-cancel');
const linkModalSave = document.getElementById('link-modal-save');

let modalMode = 'add'; // 'add' | 'edit'
let editingLinkId = null;

function openLinkModal(mode, link) {
  modalMode = mode;
  editingLinkId = link ? link.id : null;
  linkModalTitle.textContent = mode === 'edit' ? '// edit shortcut' : '// new shortcut';
  linkNameInput.value = link ? link.label : '';
  linkUrlInput.value = link ? link.url.replace(/^https?:\/\//i, '') : '';
  linkModalOverlay.classList.add('show');
  setTimeout(() => linkNameInput.focus(), 0);
}

function closeLinkModal() {
  linkModalOverlay.classList.remove('show');
  editingLinkId = null;
}

document.getElementById('link-add').addEventListener('click', () => {
  closeAllMenus();
  openLinkModal('add', null);
});
linkModalCancel.addEventListener('click', closeLinkModal);
linkModalOverlay.addEventListener('click', (e) => {
  if (e.target === linkModalOverlay) closeLinkModal();
});

linkModalSave.addEventListener('click', () => {
  const label = linkNameInput.value.trim();
  const urlRaw = linkUrlInput.value.trim();
  if (!label || !urlRaw) return;
  const url = normalizeUrl(urlRaw);

  if (modalMode === 'edit' && editingLinkId) {
    const target = links.find(l => l.id === editingLinkId);
    if (target) {
      target.label = label;
      target.url = url;
    }
  } else {
    links.push({ id: uid(), label, url });
  }
  storageSet('links', links);
  renderLinks();
  closeLinkModal();
});

[linkNameInput, linkUrlInput].forEach(inp => {
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      linkModalSave.click();
    } else if (e.key === 'Escape') {
      closeLinkModal();
    }
  });
});


/* ---------------- INIT + LIVE CROSS-TAB SYNC ---------------- */

const DEFAULT_LINKS = [
  { id: uid(), label: 'GitHub', url: 'https://github.com' },
  { id: uid(), label: 'ChatGPT', url: 'https://chatgpt.com' },
  { id: uid(), label: 'Notion', url: 'https://notion.so' }
];

const DEFAULT_NOTES = [
  { id: uid(), text: 'pin important stuff here', color: NOTE_COLORS[0] }
];

storageGet({ todos: [], notes: DEFAULT_NOTES, links: DEFAULT_LINKS }).then(data => {
  todos = data.todos || [];
  notes = data.notes || [];
  links = data.links || [];
  backfillNoteColors();
  renderTodos();
  renderNotes();
  renderLinks();
});

if (hasChromeStorage) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.todos) {
      todos = changes.todos.newValue || [];
      renderTodos();
    }
    if (changes.notes) {
      notes = changes.notes.newValue || [];
      backfillNoteColors();
      renderNotes();
    }
    if (changes.links) {
      links = changes.links.newValue || [];
      renderLinks();
    }
  });
}
