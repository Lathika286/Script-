// Get DOM elements
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const priorityInput = document.getElementById('priorityInput');
const addTaskButton = document.getElementById('addTask');
const taskList = document.getElementById('taskList');
const totalTasks = document.getElementById('totalTasks');
const activeTasks = document.getElementById('activeTasks');
const completedTasks = document.getElementById('completedTasks');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompleted');
const themeToggle = document.getElementById('themeToggle');
const searchInput = document.getElementById('searchInput');
const toast = document.getElementById('toast');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let editingTaskId = null;


const setTheme = (theme) => {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
};
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);
themeToggle.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    setTheme(newTheme);
});


function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}


let dragSrcIdx = null;
function handleDragStart(e) {
    dragSrcIdx = +this.dataset.index;
    this.style.opacity = '0.5';
}
function handleDragOver(e) {
    e.preventDefault();
    this.style.boxShadow = '0 0 10px #667eea';
}
function handleDrop(e) {
    e.preventDefault();
    const targetIdx = +this.dataset.index;
    if (dragSrcIdx !== null && dragSrcIdx !== targetIdx) {
        const moved = tasks.splice(dragSrcIdx, 1)[0];
        tasks.splice(targetIdx, 0, moved);
        saveTasks();
        renderTasks();
    }
}
function handleDragEnd(e) {
    this.style.opacity = '';
    this.style.boxShadow = '';
    dragSrcIdx = null;
}


const saveTasks = () => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
};

const createTaskElement = (task, idx) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.setAttribute('draggable', 'true');
    li.dataset.index = idx;

    
    let isOverdue = false;
    if (task.dueDate && !task.completed) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(task.dueDate);
        if (due < today) isOverdue = true;
    }
    if (isOverdue) li.classList.add('overdue');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    if (editingTaskId === task.id) {
       
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = task.text;
        editInput.className = 'edit-input';
        editInput.autofocus = true;
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveEdit(task.id, editInput.value, null);
            if (e.key === 'Escape') cancelEdit();
        });

      
        const editPriority = document.createElement('select');
        editPriority.className = 'priority-input';
        ['low','medium','high'].forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
            if (task.priority === p) opt.selected = true;
            editPriority.appendChild(opt);
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => saveEdit(task.id, editInput.value, editPriority.value);

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = cancelEdit;

        li.appendChild(checkbox);
        li.appendChild(editInput);
        li.appendChild(editPriority);
        li.appendChild(saveBtn);
        li.appendChild(cancelBtn);
    } else {
        const taskText = document.createElement('span');
        taskText.textContent = task.text;

   
        const badge = document.createElement('span');
        badge.className = `priority-badge priority-${task.priority || 'medium'}`;
        badge.textContent = (task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1);
        taskText.appendChild(badge);


        if (task.dueDate) {
            const dueLabel = document.createElement('span');
            dueLabel.className = 'due-date-label';
            dueLabel.textContent = `Due: ${task.dueDate}`;
            taskText.appendChild(dueLabel);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '<i class="fas fa-pen"></i>';
        editBtn.title = 'Edit';
        editBtn.onclick = () => startEdit(task.id);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.addEventListener('click', () => deleteTask(task.id));

        li.appendChild(checkbox);
        li.appendChild(taskText);
        li.appendChild(editBtn);
        li.appendChild(deleteButton);
    }

    // Drag events
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    return li;
};

// Function to render all tasks (with search)
const renderTasks = () => {
    taskList.innerHTML = '';
    let filteredTasks = tasks;
    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    // Search filter
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(task => task.text.toLowerCase().includes(searchTerm));
    }
    filteredTasks.forEach((task, idx) => {
        taskList.appendChild(createTaskElement(task, tasks.indexOf(task)));
    });
    updateCounters();
    updateFilterButtons();
    updateProgressBar();
};

// Function to add a new task
const addTask = () => {
    const text = taskInput.value.trim();
    const dueDate = dueDateInput.value;
    const priority = priorityInput.value;
    if (text) {
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            dueDate: dueDate || null,
            priority: priority || 'medium'
        };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskInput.value = '';
        dueDateInput.value = '';
        priorityInput.value = 'medium';
        showToast('Task added!');
    }
};

// Function to toggle task completion
const toggleTask = (taskId) => {
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            showToast(task.completed ? 'Task marked as active!' : 'Task completed!');
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    renderTasks();
};

// Function to delete a task
const deleteTask = (taskId) => {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks();
    renderTasks();
    showToast('Task deleted!');
};

// Edit task functions
const startEdit = (taskId) => {
    editingTaskId = taskId;
    renderTasks();
};
const saveEdit = (taskId, newText, newPriority) => {
    if (newText.trim() === '') return;
    tasks = tasks.map(task => task.id === taskId ? { ...task, text: newText, priority: newPriority || task.priority } : task);
    editingTaskId = null;
    saveTasks();
    renderTasks();
    showToast('Task updated!');
};
const cancelEdit = () => {
    editingTaskId = null;
    renderTasks();
};

// Task counters
const updateCounters = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    totalTasks.textContent = `Total: ${total}`;
    activeTasks.textContent = `Active: ${active}`;
    completedTasks.textContent = `Completed: ${completed}`;
};

// Filter tasks
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-filter');
        renderTasks();
    });
});
const updateFilterButtons = () => {
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === currentFilter);
    });
};

// Clear completed tasks
clearCompletedBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all completed tasks?')) {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }
});

// Event listeners
addTaskButton.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});
dueDateInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});
searchInput.addEventListener('input', renderTasks);

taskList.addEventListener('dblclick', (e) => {
    // Optional: double-click on task text to edit
    const li = e.target.closest('li.task-item');
    if (!li) return;
    const idx = Array.from(taskList.children).indexOf(li);
    const filteredTasks = (currentFilter === 'all') ? tasks : (currentFilter === 'active' ? tasks.filter(t => !t.completed) : tasks.filter(t => t.completed));
    if (filteredTasks[idx]) startEdit(filteredTasks[idx].id);
});

// Progress bar update
function updateProgressBar() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBar.style.width = percent + '%';
    progressText.textContent = `${percent}% Done`;
}

// Initial render
renderTasks(); 