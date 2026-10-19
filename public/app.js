// State
let todos = [];
let currentFilter = 'all';

// DOM Elements
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');
const itemsLeft = document.getElementById('itemsLeft');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterButtons = document.querySelectorAll('.filter-btn');
const countAll = document.getElementById('countAll');
const countActive = document.getElementById('countActive');
const countCompleted = document.getElementById('countCompleted');
const completionRate = document.getElementById('completionRate');
const currentDateEl = document.getElementById('currentDate');

// Format current date
function updateDateDisplay() {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  currentDateEl.textContent = new Date().toLocaleDateString(undefined, options);
}

// Fetch all todos from server
async function fetchTodos() {
  try {
    const res = await fetch('/api/todos');
    if (!res.ok) throw new Error('Failed to load todos');
    todos = await res.json();
    render();
  } catch (err) {
    console.error('Error fetching todos:', err);
  }
}

// Add a new task
async function addTodo(title) {
  try {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!res.ok) throw new Error('Failed to add task');
    const newTodo = await res.json();
    todos.unshift(newTodo);
    render();
  } catch (err) {
    console.error('Error adding todo:', err);
  }
}

// Toggle complete status
async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const previousState = todo.completed;
  todo.completed = !todo.completed;
  render();

  try {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: todo.completed })
    });
    if (!res.ok) throw new Error('Failed to update task');
  } catch (err) {
    console.error('Error updating todo:', err);
    // Revert optimistic update on failure
    todo.completed = previousState;
    render();
  }
}

// Delete a task
async function deleteTodo(id) {
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return;

  const [removedTodo] = todos.splice(index, 1);
  render();

  try {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete task');
  } catch (err) {
    console.error('Error deleting todo:', err);
    // Revert optimistic delete on failure
    todos.splice(index, 0, removedTodo);
    render();
  }
}

// Clear all completed tasks
async function clearCompleted() {
  const completedCount = todos.filter(t => t.completed).length;
  if (completedCount === 0) return;

  const originalTodos = [...todos];
  todos = todos.filter(t => !t.completed);
  render();

  try {
    const res = await fetch('/api/todos/completed', {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to clear completed tasks');
  } catch (err) {
    console.error('Error clearing completed:', err);
    todos = originalTodos;
    render();
  }
}

// Filter tasks
function getFilteredTodos() {
  switch (currentFilter) {
    case 'active':
      return todos.filter(t => !t.completed);
    case 'completed':
      return todos.filter(t => t.completed);
    default:
      return todos;
  }
}

// Render DOM
function render() {
  const filtered = getFilteredTodos();
  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  // Update counters
  countAll.textContent = totalCount;
  countActive.textContent = activeCount;
  countCompleted.textContent = completedCount;
  itemsLeft.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} remaining`;
  completionRate.textContent = `${completedCount}/${totalCount} done`;

  // Toggle Clear Completed button visibility
  clearCompletedBtn.style.display = completedCount > 0 ? 'inline-block' : 'none';

  // Render list or empty state
  if (filtered.length === 0) {
    todoList.innerHTML = '';
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';
    todoList.innerHTML = filtered.map(todo => `
      <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
        <div class="item-left">
          <label class="custom-checkbox">
            <input 
              type="checkbox" 
              ${todo.completed ? 'checked' : ''} 
              aria-label="Mark task as complete"
              onchange="toggleTodo('${todo.id}')"
            />
            <span class="checkmark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </label>
          <span class="todo-text" onclick="toggleTodo('${todo.id}')">${escapeHtml(todo.title)}</span>
        </div>
        <button 
          type="button" 
          class="btn-delete" 
          aria-label="Delete task" 
          onclick="deleteTodo('${todo.id}')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </li>
    `).join('');
  }
}

// HTML escaping helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event Listeners
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;
  addTodo(title);
  todoInput.value = '';
  todoInput.focus();
});

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearCompletedBtn.addEventListener('click', clearCompleted);

// Global bindings for inline handlers
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;

// Initialize
updateDateDisplay();
fetchTodos();
