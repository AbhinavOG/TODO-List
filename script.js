const STORAGE_KEY = 'focus-todo-items';

let todos = loadTodos();
let filter = 'all';
let nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;

const listEl = document.getElementById('list');
const emptyState = document.getElementById('emptyState');
const addForm = document.getElementById('addForm');
const addInput = document.getElementById('addInput');
const clearBtn = document.getElementById('clearBtn');
const progressFill = document.getElementById('progressFill');
const progressCount = document.getElementById('progressCount');
const progressPct = document.getElementById('progressPct');
const countAll = document.getElementById('countAll');
const countActive = document.getElementById('countActive');
const countDone = document.getElementById('countDone');
const emptyTitle = document.getElementById('emptyTitle');
const emptyDesc = document.getElementById('emptyDesc');

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // localStorage unavailable (private browsing, storage full, etc.) — fail silently
  }
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = addInput.value.trim();
  if (!text) return;
  todos.unshift({ id: nextId++, text, done: false });
  addInput.value = '';
  saveTodos();
  render();
});

clearBtn.addEventListener('click', () => {
  const toRemove = todos.filter(t => t.done).map(t => t.id);
  animateRemove(toRemove, () => {
    todos = todos.filter(t => !t.done);
    saveTodos();
    render();
  });
});

function toggleDone(id) {
  const t = todos.find(t => t.id === id);
  if (t) t.done = !t.done;
  saveTodos();
  render();
}

function deleteTodo(id) {
  animateRemove([id], () => {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    render();
  });
}

function animateRemove(ids, done) {
  ids.forEach(id => {
    const el = listEl.querySelector(`[data-id="${id}"]`);
    if (el) el.classList.add('removing');
  });
  setTimeout(done, ids.length ? 220 : 0);
}

function startEdit(id) {
  const item = todos.find(t => t.id === id);
  if (!item) return;
  const el = listEl.querySelector(`[data-id="${id}"] .item-text`);
  if (!el) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = item.text;
  input.className = 'item-edit';
  input.maxLength = 140;
  el.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  function commit() {
    const val = input.value.trim();
    if (val) item.text = val;
    saveTodos();
    render();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { render(); }
  });
}

function render() {
  const visible = todos.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  listEl.innerHTML = '';
  visible.forEach(t => {
    const li = document.createElement('li');
    li.className = 'item' + (t.done ? ' done' : '');
    li.dataset.id = t.id;
    li.innerHTML = `
      <button class="checkbox" aria-label="Toggle done">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </button>
      <span class="item-text">${escapeHtml(t.text)}</span>
      <div class="item-actions">
        <button class="icon-btn edit" aria-label="Edit task">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="icon-btn delete" aria-label="Delete task">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"/></svg>
        </button>
      </div>
    `;
    li.querySelector('.checkbox').addEventListener('click', () => toggleDone(t.id));
    li.querySelector('.edit').addEventListener('click', () => startEdit(t.id));
    li.querySelector('.delete').addEventListener('click', () => deleteTodo(t.id));
    li.querySelector('.item-text').addEventListener('dblclick', () => startEdit(t.id));
    listEl.appendChild(li);
  });

  if (todos.length === 0) {
    emptyState.style.display = 'block';
    emptyTitle.textContent = 'Nothing here yet';
    emptyDesc.textContent = 'Add your first task above to get started.';
    listEl.style.display = 'none';
  } else if (visible.length === 0) {
    emptyState.style.display = 'block';
    listEl.style.display = 'none';
    if (filter === 'active') { emptyTitle.textContent = 'All caught up'; emptyDesc.textContent = 'No active tasks right now.'; }
    else { emptyTitle.textContent = 'Nothing completed yet'; emptyDesc.textContent = 'Finished tasks will show up here.'; }
  } else {
    emptyState.style.display = 'none';
    listEl.style.display = 'flex';
  }

  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const active = total - done;
  countAll.textContent = total;
  countActive.textContent = active;
  countDone.textContent = done;
  progressCount.textContent = `${done} of ${total} done`;
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressPct.textContent = pct + '%';
  progressFill.style.width = pct + '%';
  clearBtn.disabled = done === 0;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

render();
