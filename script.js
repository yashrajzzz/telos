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


/* ---------------- STORAGE HELPERS ---------------- */

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


/* ---------------- TODO LIST ---------------- */

let todos = load('devdash_todos', []);

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
      save('devdash_todos', todos);
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
      save('devdash_todos', todos);
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
  save('devdash_todos', todos);
  input.value = '';
  renderTodos();
});

renderTodos();


/* ---------------- STICKY NOTES ---------------- */

const NOTE_COLORS = ['yellow', 'pink', 'green', 'blue'];
const MAX_NOTES = 4;

let notes = load('devdash_notes', [
  { id: uid(), text: 'pin important stuff here', color: 'yellow' }
]);

// backfill colors for any notes saved before colors existed
notes.forEach((note, i) => {
  if (!note.color) note.color = NOTE_COLORS[i % NOTE_COLORS.length];
});

function renderNotes() {
  const board = document.getElementById('notes-board');
  board.innerHTML = '';

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
      save('devdash_notes', notes);
    });

    const del = document.createElement('button');
    del.className = 'note-del';
    del.textContent = 'remove';
    del.addEventListener('click', () => {
      notes = notes.filter(n => n.id !== note.id);
      save('devdash_notes', notes);
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
  // pick a color not currently in use where possible
  const usedColors = notes.map(n => n.color);
  const nextColor = NOTE_COLORS.find(c => !usedColors.includes(c)) || NOTE_COLORS[notes.length % NOTE_COLORS.length];
  notes.push({ id: uid(), text: '', color: nextColor });
  save('devdash_notes', notes);
  renderNotes();
});

renderNotes();


/* ---------------- SHORTCUTS ---------------- */

let links = load('devdash_links', [
  { id: uid(), label: 'GitHub', url: 'https://github.com' },
  { id: uid(), label: 'Stack Overflow', url: 'https://stackoverflow.com' },
  { id: uid(), label: 'MDN Docs', url: 'https://developer.mozilla.org' },
  { id: uid(), label: 'DevDocs', url: 'https://devdocs.io' },
  { id: uid(), label: 'Can I use', url: 'https://caniuse.com' },
  { id: uid(), label: 'npm', url: 'https://www.npmjs.com' }
]);

function normalizeUrl(u) {
  if (!/^https?:\/\//i.test(u)) return 'https://' + u;
  return u;
}

function closeAllMenus() {
  document.querySelectorAll('.link-menu.show').forEach(m => m.classList.remove('show'));
  document.querySelectorAll('.menu-btn.open').forEach(b => b.classList.remove('open'));
}

function renderLinks() {
  const grid = document.getElementById('links-grid');
  grid.innerHTML = '';

  links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'link-tile';
    a.href = link.url;

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
      save('devdash_links', links);
      renderLinks();
    });

    a.append(dot, label, menuBtn, menu);
    grid.appendChild(a);
  });
}

document.addEventListener('click', closeAllMenus);

/* ---- add / edit modal ---- */

const linkModalOverlay = document.getElementById('link-modal-overlay');
const linkModalTitle = document.getElementById('link-modal-title');
const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput = document.getElementById('link-url-input');
const linkModalCancel = document.getElementById('link-modal-cancel');
const linkModalSave = document.getElementById('link-modal-save');

let modalMode = 'add'; // 'add' | 'edit'
let editingLink = null;

function openLinkModal(mode, link) {
  modalMode = mode;
  editingLink = link || null;
  linkModalTitle.textContent = mode === 'edit' ? '// edit shortcut' : '// new shortcut';
  linkNameInput.value = link ? link.label : '';
  linkUrlInput.value = link ? link.url.replace(/^https?:\/\//i, '') : '';
  linkModalOverlay.classList.add('show');
  setTimeout(() => linkNameInput.focus(), 0);
}

function closeLinkModal() {
  linkModalOverlay.classList.remove('show');
  editingLink = null;
}

document.getElementById('link-add').addEventListener('click', () => openLinkModal('add', null));
linkModalCancel.addEventListener('click', closeLinkModal);
linkModalOverlay.addEventListener('click', (e) => {
  if (e.target === linkModalOverlay) closeLinkModal();
});

linkModalSave.addEventListener('click', () => {
  const label = linkNameInput.value.trim();
  const urlRaw = linkUrlInput.value.trim();
  if (!label || !urlRaw) return;
  const url = normalizeUrl(urlRaw);

  if (modalMode === 'edit' && editingLink) {
    editingLink.label = label;
    editingLink.url = url;
  } else {
    links.push({ id: uid(), label, url });
  }
  save('devdash_links', links);
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

renderLinks();
