/* ============================================================
   CECMS — script.js
   Complete frontend logic: navigation, API calls, tables, forms
   ============================================================ */

const API_BASE = 'http://127.0.0.1:5001';

/* ── CACHED DATA ─────────────────────────────────────────── */
let cachedStudents = [];
let cachedEvents   = [];
let cachedTeams    = [];
let cachedRegistrations = [];

/* ============================================================
   NAVIGATION
   ============================================================ */
const navItems   = document.querySelectorAll('.nav-item');
const pages      = document.querySelectorAll('.page');
const topbarTitle = document.getElementById('topbarTitle');
const menuToggle  = document.getElementById('menuToggle');
const sidebar     = document.getElementById('sidebar');

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  students: 'Students',
  events: 'Events',
  registrations: 'Registrations',
  payments: 'Payments',
  feedback: 'Feedback',
};

function navigateTo(pageId) {
  navItems.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId));
  pages.forEach(p => p.classList.toggle('active', p.id === `page-${pageId}`));
  topbarTitle.textContent = PAGE_TITLES[pageId] || pageId;
  sidebar.classList.remove('open');
  loadPage(pageId);
}

navItems.forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

document.addEventListener('click', e => {
  if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

function loadPage(pageId) {
  switch (pageId) {
    case 'dashboard':     loadDashboard();      break;
    case 'students':      loadStudents();        break;
    case 'events':        loadEvents();          break;
    case 'registrations': loadRegistrations();   break;
    case 'payments':      loadPayments();        break;
    case 'feedback':      loadFeedback();        break;
  }
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3200);
}

/* ============================================================
   MODAL
   ============================================================ */
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const modalBody    = document.getElementById('modalBody');
const modalClose   = document.getElementById('modalClose');

function openModal(title, bodyHTML) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalOverlay.classList.add('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
  modalBody.innerHTML = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

/* ============================================================
   API HELPERS
   ============================================================ */
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ── BADGE HELPER ─────────────────────────────────────────── */
function badge(text) {
  if (!text) return '<span class="badge badge-default">—</span>';
  const map = {
    PENDING:   'badge-pending',
    REGISTERED:'badge-confirmed',
    CONFIRMED: 'badge-confirmed',
    CANCELLED: 'badge-cancelled',
    ATTENDED:  'badge-attended',
    SUCCESS:   'badge-success',
    FAILED:    'badge-failed',
    REFUNDED:  'badge-refunded',
  };
  const cls = map[text?.toUpperCase()] || 'badge-default';
  return `<span class="badge ${cls}">${text}</span>`;
}

function stars(rating) {
  if (!rating) return '—';
  const filled = '★'.repeat(rating);
  const empty  = '☆'.repeat(5 - rating);
  return `<span class="stars">${filled}${empty}</span>`;
}

function fmt(val, fallback = '—') {
  return val !== null && val !== undefined && val !== '' ? val : fallback;
}

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toDateTimeLocal(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function genId() {
  return Math.floor(Date.now() / 1000) % 1000000 + Math.floor(Math.random() * 999);
}

/* ============================================================
   SEARCH FILTER HELPER
   ============================================================ */
function setupSearch(inputId, tbodyId, rowFilter) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const rows = document.querySelectorAll(`#${tbodyId} tr`);
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ============================================================
   DASHBOARD
   ============================================================ */
async function loadDashboard() {
  try {
    const [studRes, evtRes, regRes, payRes, fbRes] = await Promise.all([
      apiGet('/api/students'),
      apiGet('/api/events'),
      apiGet('/api/registrations'),
      apiGet('/api/payments'),
      apiGet('/api/feedback'),
    ]);

    document.getElementById('stat-students').textContent      = studRes.count ?? 0;
    document.getElementById('stat-events').textContent        = evtRes.count ?? 0;
    document.getElementById('stat-registrations').textContent = regRes.count ?? 0;
    document.getElementById('stat-payments').textContent      = payRes.count ?? 0;
    document.getElementById('stat-feedback').textContent      = fbRes.count ?? 0;

    // Recent registrations (last 5)
    const regs = (regRes.data || []).slice(0, 5);
    const regTbody = document.querySelector('#dashRecentRegs tbody');
    regTbody.innerHTML = regs.length ? regs.map(r => `
      <tr>
        <td><span class="mono">${r.REGISTRATION_ID}</span></td>
        <td>${fmt(r.FULL_NAME)}</td>
        <td class="truncate">${fmt(r.EVENT_TITLE)}</td>
        <td>${fmtDate(r.REGISTRATION_DATE)}</td>
        <td>${badge(r.STATUS)}</td>
      </tr>`).join('') : `<tr><td colspan="5" class="empty-row">No registrations yet</td></tr>`;

    // Recent payments (last 5)
    const pays = (payRes.data || []).slice(0, 5);
    const payTbody = document.querySelector('#dashRecentPayments tbody');
    payTbody.innerHTML = pays.length ? pays.map(p => `
      <tr>
        <td><span class="mono">${p.PAYMENT_ID}</span></td>
        <td><span class="mono">${p.REGISTRATION_ID}</span></td>
        <td>₹${Number(p.AMOUNT).toLocaleString('en-IN')}</td>
        <td>${fmt(p.PAYMENT_MODE)}</td>
        <td>${badge(p.PAYMENT_STATUS)}</td>
      </tr>`).join('') : `<tr><td colspan="5" class="empty-row">No payments yet</td></tr>`;

  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

/* ============================================================
   STUDENTS
   ============================================================ */
async function loadStudents() {
  const tbody = document.getElementById('studentsBody');
  tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Loading…</td></tr>`;
  try {
    const res = await apiGet('/api/students');
    cachedStudents = res.data || [];
    renderStudentsTable(cachedStudents);
    setupSearch('searchStudents', 'studentsBody');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Error: ${err.message}</td></tr>`;
    showToast('Failed to load students: ' + err.message, 'error');
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsBody');
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No students found</td></tr>`;
    return;
  }
  tbody.innerHTML = students.map(s => `
    <tr>
      <td><span class="mono">${s.STUDENT_ID}</span></td>
      <td><b>${fmt(s.ROLL_NO)}</b></td>
      <td>${fmt(s.FULL_NAME)}</td>
      <td>${fmt(s.EMAIL)}</td>
      <td>${fmt(s.DEPARTMENT)}</td>
      <td>${fmt(s.ACADEMIC_YEAR)}</td>
      <td>${fmt(s.PHONE)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" onclick="openEditStudent(${s.STUDENT_ID})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.STUDENT_ID})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('btnAddStudent').addEventListener('click', () => {
  openModal('Add New Student', studentForm());
  document.getElementById('studentSubmitBtn').addEventListener('click', submitAddStudent);
});

function studentForm(data = {}) {
  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Student ID *</label>
        <input class="form-control" id="f_student_id" type="number" placeholder="e.g. 1001" value="${data.STUDENT_ID || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Roll Number *</label>
        <input class="form-control" id="f_roll_no" type="text" placeholder="e.g. CS2024001" value="${data.ROLL_NO || ''}">
      </div>
      <div class="form-group full">
        <label class="form-label">Full Name *</label>
        <input class="form-control" id="f_full_name" type="text" placeholder="Student full name" value="${data.FULL_NAME || ''}">
      </div>
      <div class="form-group full">
        <label class="form-label">Email *</label>
        <input class="form-control" id="f_email" type="email" placeholder="student@college.edu" value="${data.EMAIL || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Department *</label>
        <select class="form-control" id="f_department">
          <option value="">Select department</option>
          ${['Computer Science','Information Technology','Electronics','Mechanical','Civil','Electrical','Chemical','Biotechnology','MBA','MCA'].map(d =>
            `<option value="${d}" ${data.DEPARTMENT === d ? 'selected' : ''}>${d}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Academic Year *</label>
        <select class="form-control" id="f_academic_year">
          <option value="">Select year</option>
          ${[1,2,3,4,5].map(y =>
            `<option value="${y}" ${data.ACADEMIC_YEAR === y ? 'selected' : ''}>${y}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-control" id="f_phone" type="tel" placeholder="10-digit number" value="${data.PHONE || ''}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="studentSubmitBtn">Save Student</button>
    </div>`;
}

async function submitAddStudent() {
  const body = {
    student_id:    parseInt(document.getElementById('f_student_id').value),
    roll_no:       document.getElementById('f_roll_no').value.trim(),
    full_name:     document.getElementById('f_full_name').value.trim(),
    email:         document.getElementById('f_email').value.trim(),
    department:    document.getElementById('f_department').value,
    academic_year: parseInt(document.getElementById('f_academic_year').value),
    phone:         document.getElementById('f_phone').value.trim() || null,
  };

  if (!body.student_id || !body.roll_no || !body.full_name || !body.email || !body.department || !body.academic_year) {
    showToast('Please fill in all required fields', 'error'); return;
  }

  try {
    await apiPost('/api/students', body);
    showToast('Student added successfully');
    closeModal();
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditStudent(studentId) {
  const student = cachedStudents.find(s => s.STUDENT_ID === studentId);
  if (!student) return showToast('Student not found', 'error');

  openModal('Edit Student', studentForm(student));
  document.getElementById('f_student_id').disabled = true;
  document.getElementById('studentSubmitBtn').textContent = 'Update Student';
  document.getElementById('studentSubmitBtn').addEventListener('click', () => submitEditStudent(studentId));
}

async function submitEditStudent(studentId) {
  const body = {
    roll_no:       document.getElementById('f_roll_no').value.trim(),
    full_name:     document.getElementById('f_full_name').value.trim(),
    email:         document.getElementById('f_email').value.trim(),
    department:    document.getElementById('f_department').value,
    academic_year: parseInt(document.getElementById('f_academic_year').value),
    phone:         document.getElementById('f_phone').value.trim() || null,
  };

  try {
    await apiPut(`/api/students/${studentId}`, body);
    showToast('Student updated successfully');
    closeModal();
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteStudent(studentId) {
  if (!confirm(`Delete student ID ${studentId}? This action cannot be undone.`)) return;
  try {
    await apiDelete(`/api/students/${studentId}`);
    showToast('Student deleted');
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   EVENTS
   ============================================================ */
async function loadEvents() {
  const tbody = document.getElementById('eventsBody');
  tbody.innerHTML = `<tr><td colspan="11" class="empty-row">Loading…</td></tr>`;
  try {
    const res = await apiGet('/api/events');
    cachedEvents = res.data || [];
    renderEventsTable(cachedEvents);
    setupSearch('searchEvents', 'eventsBody');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-row">Error: ${err.message}</td></tr>`;
    showToast('Failed to load events: ' + err.message, 'error');
  }
}

function renderEventsTable(events) {
  const tbody = document.getElementById('eventsBody');
  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-row">No events found</td></tr>`;
    return;
  }
  tbody.innerHTML = events.map(e => `
    <tr>
      <td><span class="mono">${e.EVENT_ID}</span></td>
      <td><b class="truncate" style="display:block;max-width:160px">${fmt(e.EVENT_TITLE)}</b></td>
      <td>${fmt(e.EVENT_TYPE)}</td>
      <td>${fmtDateTime(e.START_DATETIME)}</td>
      <td>${fmtDateTime(e.END_DATETIME)}</td>
      <td>${fmt(e.REGISTRATION_TYPE)}</td>
      <td>${fmt(e.MAX_CAPACITY, '∞')}</td>
      <td>${e.FEE ? '₹' + Number(e.FEE).toLocaleString('en-IN') : 'Free'}</td>
      <td>${fmt(e.CLUB_ID)}</td>
      <td>${fmt(e.VENUE_ID)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" onclick="openEditEvent(${e.EVENT_ID})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteEvent(${e.EVENT_ID})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('btnAddEvent').addEventListener('click', () => {
  openModal('Add New Event', eventForm({}, false));
  document.getElementById('eventSubmitBtn').addEventListener('click', submitAddEvent);
});

function eventForm(data = {}, isEdit = false) {
  const toLocal = (v) => toDateTimeLocal(v);
  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Event ID *</label>
        <input class="form-control" id="f_event_id" type="number" placeholder="e.g. 201" value="${isEdit ? data.EVENT_ID : genId()}">
      </div>
      <div class="form-group">
        <label class="form-label">Event Type *</label>
        <select class="form-control" id="f_event_type">
          <option value="">Select type</option>
          ${['Technical','Cultural','Sports','Workshop','Seminar','Competition','Hackathon','Other'].map(t =>
            `<option value="${t}" ${String(data.EVENT_TYPE || '').toUpperCase() === t.toUpperCase() ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Event Title *</label>
        <input class="form-control" id="f_event_title" type="text" placeholder="Event name" value="${data.EVENT_TITLE || ''}">
      </div>
      <div class="form-group full">
        <label class="form-label">Description</label>
        <textarea class="form-control" id="f_description" placeholder="Brief description of the event">${data.DESCRIPTION || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Start Date & Time *</label>
        <input class="form-control" id="f_start_datetime" type="datetime-local" value="${toLocal(data.START_DATETIME)}">
      </div>
      <div class="form-group">
        <label class="form-label">End Date & Time *</label>
        <input class="form-control" id="f_end_datetime" type="datetime-local" value="${toLocal(data.END_DATETIME)}">
      </div>
      <div class="form-group">
        <label class="form-label">Registration Type *</label>
        <select class="form-control" id="f_registration_type">
          <option value="INDIVIDUAL" ${String(data.REGISTRATION_TYPE || '').toUpperCase() === 'INDIVIDUAL' ? 'selected' : ''}>Individual</option>
          <option value="TEAM" ${String(data.REGISTRATION_TYPE || '').toUpperCase() === 'TEAM' ? 'selected' : ''}>Team</option>
          <option value="BOTH" ${String(data.REGISTRATION_TYPE || '').toUpperCase() === 'BOTH' ? 'selected' : ''}>Both</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Max Capacity</label>
        <input class="form-control" id="f_max_capacity" type="number" placeholder="Leave blank for unlimited" value="${data.MAX_CAPACITY ?? ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Fee (₹)</label>
        <input class="form-control" id="f_fee" type="number" step="0.01" placeholder="0.00" value="${data.FEE ?? ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Club ID</label>
        <input class="form-control" id="f_club_id" type="number" placeholder="Optional" value="${data.CLUB_ID ?? ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Venue ID</label>
        <input class="form-control" id="f_venue_id" type="number" placeholder="Optional" value="${data.VENUE_ID ?? ''}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="eventSubmitBtn">${isEdit ? 'Update Event' : 'Create Event'}</button>
    </div>`;
}

async function submitAddEvent() {
  const body = {
    event_id:          parseInt(document.getElementById('f_event_id').value),
    event_title:       document.getElementById('f_event_title').value.trim(),
    event_type:        document.getElementById('f_event_type').value,
    description:       document.getElementById('f_description').value.trim() || null,
    start_datetime:    document.getElementById('f_start_datetime').value,
    end_datetime:      document.getElementById('f_end_datetime').value,
    registration_type: document.getElementById('f_registration_type').value,
    max_capacity:      parseInt(document.getElementById('f_max_capacity').value) || null,
    fee:               parseFloat(document.getElementById('f_fee').value) || 0.00,
    club_id:           parseInt(document.getElementById('f_club_id').value) || null,
    venue_id:          parseInt(document.getElementById('f_venue_id').value) || null,
  };

  if (!body.event_id || !body.event_title || !body.event_type || !body.start_datetime || !body.end_datetime) {
    showToast('Please fill in all required fields', 'error'); return;
  }

  if (new Date(body.end_datetime) <= new Date(body.start_datetime)) {
    showToast('End date must be after start date', 'error'); return;
  }

  try {
    await apiPost('/api/events', body);
    showToast('Event created successfully');
    closeModal();
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditEvent(eventId) {
  const event = cachedEvents.find(e => e.EVENT_ID === eventId);
  if (!event) return showToast('Event not found', 'error');

  openModal('Edit Event', eventForm(event, true));
  document.getElementById('f_event_id').disabled = true;
  document.getElementById('eventSubmitBtn').addEventListener('click', () => submitEditEvent(eventId));
}

async function submitEditEvent(eventId) {
  const body = {
    event_title:       document.getElementById('f_event_title').value.trim(),
    event_type:        document.getElementById('f_event_type').value,
    description:       document.getElementById('f_description').value.trim() || null,
    start_datetime:    document.getElementById('f_start_datetime').value,
    end_datetime:      document.getElementById('f_end_datetime').value,
    registration_type: document.getElementById('f_registration_type').value,
    max_capacity:      parseInt(document.getElementById('f_max_capacity').value) || null,
    fee:               parseFloat(document.getElementById('f_fee').value) || 0.00,
    club_id:           parseInt(document.getElementById('f_club_id').value) || null,
    venue_id:          parseInt(document.getElementById('f_venue_id').value) || null,
  };

  if (!body.event_title || !body.event_type || !body.start_datetime || !body.end_datetime || !body.registration_type) {
    showToast('Please fill in all required fields', 'error'); return;
  }
  if (new Date(body.end_datetime) <= new Date(body.start_datetime)) {
    showToast('End date must be after start date', 'error'); return;
  }

  try {
    await apiPut(`/api/events/${eventId}`, body);
    showToast('Event updated successfully');
    closeModal();
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteEvent(eventId) {
  if (!confirm(`Delete event ID ${eventId}?`)) return;
  try {
    await apiDelete(`/api/events/${eventId}`);
    showToast('Event deleted');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   REGISTRATIONS
   ============================================================ */
async function loadTeams() {
  try {
    const res = await apiGet('/api/teams');
    cachedTeams = res.data || [];
  } catch (_) {
    cachedTeams = [];
  }
}

async function loadRegistrations() {
  const tbody = document.getElementById('registrationsBody');
  tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Loading…</td></tr>`;
  try {
    await loadTeams();
    const res = await apiGet('/api/registrations');
    cachedRegistrations = res.data || [];
    renderRegistrationsTable(cachedRegistrations);
    setupSearch('searchRegistrations', 'registrationsBody');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Error: ${err.message}</td></tr>`;
    showToast('Failed to load registrations: ' + err.message, 'error');
  }
}

function renderRegistrationsTable(regs) {
  const tbody = document.getElementById('registrationsBody');
  if (!regs.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No registrations found</td></tr>`;
    return;
  }
  tbody.innerHTML = regs.map(r => `
    <tr>
      <td><span class="mono">${r.REGISTRATION_ID}</span></td>
      <td><span class="mono">${r.STUDENT_ID}</span></td>
      <td>${fmt(r.FULL_NAME)}</td>
      <td><span class="mono">${r.EVENT_ID}</span></td>
      <td class="truncate">${fmt(r.EVENT_TITLE)}</td>
      <td>${r.TEAM_ID ? `<span class="mono">${r.TEAM_ID}</span>` : '—'}</td>
      <td>${fmtDate(r.REGISTRATION_DATE)}</td>
      <td>${badge(r.STATUS)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" onclick="openEditRegistration(${r.REGISTRATION_ID})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRegistration(${r.REGISTRATION_ID})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('btnAddTeam').addEventListener('click', () => {
  openModal('Create Team', teamForm());
  document.querySelectorAll('.f_team_member_checkbox').forEach(cb => {
    cb.addEventListener('change', refreshTeamLeaderOptions);
  });
  refreshTeamLeaderOptions();
  document.getElementById('teamSubmitBtn').addEventListener('click', submitAddTeam);
});

document.getElementById('btnEditTeam').addEventListener('click', async () => {
  await loadTeams();
  openModal('Edit Team', editTeamPickerForm());
  document.getElementById('f_edit_team_pick').addEventListener('change', (e) => {
    const teamId = parseInt(e.target.value);
    loadEditTeamDetails(teamId);
  });
});

document.getElementById('btnRegisterTeamGroup').addEventListener('click', () => {
  openModal('Register Team Group', teamGroupRegistrationForm());
  document.getElementById('f_team_group_id').addEventListener('change', updateTeamGroupDetails);
  updateTeamGroupDetails();
  document.getElementById('teamGroupRegSubmitBtn').addEventListener('click', submitTeamGroupRegistration);
});

document.getElementById('btnAddRegistration').addEventListener('click', () => {
  openModal('New Registration', registrationForm());
  document.getElementById('regSubmitBtn').addEventListener('click', submitAddRegistration);
});

function teamForm() {
  const eventOpts = cachedEvents.length
    ? cachedEvents.map(e => `<option value="${e.EVENT_ID}">${e.EVENT_TITLE}</option>`).join('')
    : '<option value="">— load events first —</option>';

  const today = new Date().toISOString().split('T')[0];

  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Team ID * (not Registration ID)</label>
        <input class="form-control" id="f_team_id" type="number" placeholder="Unique team ID" value="${genId()}">
      </div>
      <div class="form-group">
        <label class="form-label">Created Date *</label>
        <input class="form-control" id="f_team_date" type="date" value="${today}">
      </div>
      <div class="form-group full">
        <label class="form-label">Team Name * (what this Team ID represents)</label>
        <input class="form-control" id="f_team_name" type="text" placeholder="e.g. Code Ninjas">
      </div>
      <div class="form-group full">
        <label class="form-label">Event *</label>
        <select class="form-control" id="f_team_event_id">
          <option value="">Select event</option>
          ${eventOpts}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Leader Student * (must be selected in Team Members)</label>
        <select class="form-control" id="f_team_leader_id">
          <option value="">Select members first</option>
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Team Members *</label>
        <div id="f_team_members" style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 160px; overflow:auto; border:1px solid var(--border); border-radius:7px; padding:10px;">
          ${cachedStudents.length
            ? cachedStudents.map(s => `
                <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--text-2);">
                  <input type="checkbox" class="f_team_member_checkbox" value="${s.STUDENT_ID}">
                  <span>${s.FULL_NAME} (${s.ROLL_NO})</span>
                </label>
              `).join('')
            : '<span style="font-size:12px; color:var(--text-3);">Load students first</span>'
          }
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="teamSubmitBtn">Create Team</button>
    </div>`;
}

function refreshTeamLeaderOptions() {
  const leaderSelect = document.getElementById('f_team_leader_id');
  if (!leaderSelect) return;

  const selectedMemberIds = Array.from(document.querySelectorAll('.f_team_member_checkbox:checked'))
    .map(el => parseInt(el.value));
  const current = parseInt(leaderSelect.value);

  if (!selectedMemberIds.length) {
    leaderSelect.innerHTML = `<option value="">Select members first</option>`;
    return;
  }

  leaderSelect.innerHTML = `
    <option value="">Select leader</option>
    ${selectedMemberIds.map(id => {
      const s = cachedStudents.find(stu => stu.STUDENT_ID === id);
      return `<option value="${id}">${s ? `${s.FULL_NAME} (${s.ROLL_NO})` : id}</option>`;
    }).join('')}
  `;

  if (selectedMemberIds.includes(current)) {
    leaderSelect.value = String(current);
  }
}

async function submitAddTeam() {
  const body = {
    team_id: parseInt(document.getElementById('f_team_id').value),
    team_name: document.getElementById('f_team_name').value.trim(),
    event_id: parseInt(document.getElementById('f_team_event_id').value),
    leader_student_id: parseInt(document.getElementById('f_team_leader_id').value),
    created_date: document.getElementById('f_team_date').value,
    member_student_ids: Array.from(document.querySelectorAll('.f_team_member_checkbox:checked'))
      .map(el => parseInt(el.value)),
  };

  if (!body.team_id || !body.team_name || !body.event_id || !body.leader_student_id || !body.created_date) {
    showToast('Please fill in all required team fields', 'error'); return;
  }
  if (!body.member_student_ids.length) {
    showToast('Please select at least one team member', 'error'); return;
  }
  if (!body.member_student_ids.includes(body.leader_student_id)) {
    showToast('Leader must be selected from checked team members', 'error'); return;
  }

  try {
    await apiPost('/api/teams', body);
    showToast('Team created successfully');
    await loadTeams();
    closeModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function editTeamPickerForm() {
  const teamOpts = cachedTeams.length
    ? cachedTeams.map(t => `<option value="${t.TEAM_ID}">${t.TEAM_NAME} (ID ${t.TEAM_ID})</option>`).join('')
    : '<option value="">— no teams found —</option>';

  return `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Select Existing Team *</label>
        <select class="form-control" id="f_edit_team_pick">
          <option value="">Select team</option>
          ${teamOpts}
        </select>
      </div>
      <div class="form-group full" id="f_edit_team_container">
        <div class="form-control" style="background:var(--surface-2);">Select a team to edit members and details.</div>
      </div>
    </div>
  `;
}

async function loadEditTeamDetails(teamId) {
  const container = document.getElementById('f_edit_team_container');
  if (!container) return;
  if (!teamId) {
    container.innerHTML = `<div class="form-control" style="background:var(--surface-2);">Select a team to edit members and details.</div>`;
    return;
  }

  container.innerHTML = `<div class="form-control" style="background:var(--surface-2);">Loading team details...</div>`;
  try {
    const res = await apiGet(`/api/teams/${teamId}/members`);
    const team = res.data?.team || {};
    const members = res.data?.members || [];
    const selectedMemberIds = members.map(m => Number(m.STUDENT_ID));

    const eventOpts = cachedEvents.length
      ? cachedEvents.map(e => `<option value="${e.EVENT_ID}" ${Number(e.EVENT_ID) === Number(team.EVENT_ID) ? 'selected' : ''}>${e.EVENT_TITLE}</option>`).join('')
      : '<option value="">— load events first —</option>';

    const memberCheckboxes = cachedStudents.length
      ? cachedStudents.map(s => `
          <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--text-2);">
            <input type="checkbox" class="f_team_edit_member_checkbox" value="${s.STUDENT_ID}" ${selectedMemberIds.includes(Number(s.STUDENT_ID)) ? 'checked' : ''}>
            <span>${s.FULL_NAME} (${s.ROLL_NO})</span>
          </label>
        `).join('')
      : '<span style="font-size:12px; color:var(--text-3);">Load students first</span>';

    container.innerHTML = `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Team ID</label>
          <input class="form-control" id="f_team_edit_id" type="number" value="${team.TEAM_ID}" disabled>
        </div>
        <div class="form-group">
          <label class="form-label">Created Date *</label>
          <input class="form-control" id="f_team_edit_date" type="date" value="${team.CREATED_DATE ? String(team.CREATED_DATE).split('T')[0] : ''}">
        </div>
        <div class="form-group full">
          <label class="form-label">Team Name *</label>
          <input class="form-control" id="f_team_edit_name" type="text" value="${team.TEAM_NAME || ''}">
        </div>
        <div class="form-group full">
          <label class="form-label">Event *</label>
          <select class="form-control" id="f_team_edit_event_id">
            <option value="">Select event</option>
            ${eventOpts}
          </select>
        </div>
        <div class="form-group full">
          <label class="form-label">Leader Student * (must be checked below)</label>
          <select class="form-control" id="f_team_edit_leader_id">
            <option value="">Select members first</option>
          </select>
        </div>
        <div class="form-group full">
          <label class="form-label">Team Members *</label>
          <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 160px; overflow:auto; border:1px solid var(--border); border-radius:7px; padding:10px;">
            ${memberCheckboxes}
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="teamEditSubmitBtn">Save Team Changes</button>
      </div>
    `;

    document.querySelectorAll('.f_team_edit_member_checkbox').forEach(cb => {
      cb.addEventListener('change', refreshEditTeamLeaderOptions);
    });
    refreshEditTeamLeaderOptions(team.LEADER_STUDENT_ID);
    document.getElementById('teamEditSubmitBtn').addEventListener('click', () => submitEditTeam(teamId));
  } catch (err) {
    container.innerHTML = `<div class="form-control" style="background:var(--surface-2); color:var(--rose);">Failed to load team: ${err.message}</div>`;
  }
}

function refreshEditTeamLeaderOptions(preferredLeaderId = null) {
  const leaderSelect = document.getElementById('f_team_edit_leader_id');
  if (!leaderSelect) return;

  const selectedMemberIds = Array.from(document.querySelectorAll('.f_team_edit_member_checkbox:checked'))
    .map(el => parseInt(el.value));
  const current = parseInt(leaderSelect.value);

  if (!selectedMemberIds.length) {
    leaderSelect.innerHTML = `<option value="">Select members first</option>`;
    return;
  }

  leaderSelect.innerHTML = `
    <option value="">Select leader</option>
    ${selectedMemberIds.map(id => {
      const s = cachedStudents.find(stu => stu.STUDENT_ID === id);
      return `<option value="${id}">${s ? `${s.FULL_NAME} (${s.ROLL_NO})` : id}</option>`;
    }).join('')}
  `;

  const preferred = parseInt(preferredLeaderId);
  if (selectedMemberIds.includes(current)) {
    leaderSelect.value = String(current);
  } else if (selectedMemberIds.includes(preferred)) {
    leaderSelect.value = String(preferred);
  }
}

async function submitEditTeam(teamId) {
  const body = {
    team_name: document.getElementById('f_team_edit_name').value.trim(),
    event_id: parseInt(document.getElementById('f_team_edit_event_id').value),
    leader_student_id: parseInt(document.getElementById('f_team_edit_leader_id').value),
    created_date: document.getElementById('f_team_edit_date').value,
    member_student_ids: Array.from(document.querySelectorAll('.f_team_edit_member_checkbox:checked'))
      .map(el => parseInt(el.value)),
  };

  if (!body.team_name || !body.event_id || !body.leader_student_id || !body.created_date) {
    showToast('Please fill in all required team fields', 'error'); return;
  }
  if (!body.member_student_ids.length) {
    showToast('Please select at least one team member', 'error'); return;
  }
  if (!body.member_student_ids.includes(body.leader_student_id)) {
    showToast('Leader must be selected from checked team members', 'error'); return;
  }

  try {
    await apiPut(`/api/teams/${teamId}`, body);
    showToast('Team updated successfully');
    await loadTeams();
    await loadRegistrations();
    closeModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function teamGroupRegistrationForm() {
  const today = new Date().toISOString().split('T')[0];
  const teamOpts = cachedTeams.length
    ? cachedTeams.map(t => `<option value="${t.TEAM_ID}">${t.TEAM_NAME} (ID ${t.TEAM_ID}) - ${t.EVENT_TITLE}</option>`).join('')
    : '<option value="">— create/load teams first —</option>';

  return `
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Team *</label>
        <select class="form-control" id="f_team_group_id">
          <option value="">Select team</option>
          ${teamOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Registration Date *</label>
        <input class="form-control" id="f_team_group_date" type="date" value="${today}">
      </div>
      <div class="form-group full">
        <label class="form-label">Team Details</label>
        <div id="f_team_group_details" class="form-control" style="min-height:90px; background:var(--surface-2);">
          Select a team to view members and leader.
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="teamGroupRegSubmitBtn">Register Full Team</button>
    </div>`;
}

async function updateTeamGroupDetails() {
  const detailsEl = document.getElementById('f_team_group_details');
  const teamId = parseInt(document.getElementById('f_team_group_id')?.value);
  if (!detailsEl) return;
  if (!teamId) {
    detailsEl.innerHTML = 'Select a team to view members and leader.';
    return;
  }

  detailsEl.innerHTML = 'Loading team details...';
  try {
    const res = await apiGet(`/api/teams/${teamId}/members`);
    const team = res.data?.team || {};
    const members = res.data?.members || [];
    const memberList = members.length
      ? members.map(m => `${m.FULL_NAME} (${m.ROLL_NO})${m.STUDENT_ID === team.LEADER_STUDENT_ID ? ' [Leader]' : ''}`).join('<br>')
      : 'No members found';

    detailsEl.innerHTML = `
      <div><b>Team:</b> ${fmt(team.TEAM_NAME)} (ID ${fmt(team.TEAM_ID)})</div>
      <div><b>Leader:</b> ${fmt(team.LEADER_NAME)} (ID ${fmt(team.LEADER_STUDENT_ID)})</div>
      <div style="margin-top:6px;"><b>Members:</b><br>${memberList}</div>
    `;
  } catch (err) {
    detailsEl.innerHTML = `Failed to load team details: ${err.message}`;
  }
}

async function submitTeamGroupRegistration() {
  const teamId = parseInt(document.getElementById('f_team_group_id').value);
  const registrationDate = document.getElementById('f_team_group_date').value;

  if (!teamId || !registrationDate) {
    showToast('Please select a team and date', 'error'); return;
  }

  try {
    const res = await apiPost('/api/registrations/team', {
      team_id: teamId,
      registration_date: registrationDate,
    });
    showToast(`Registered ${res.registered_count || 0} team members successfully`);
    closeModal();
    loadRegistrations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function registrationForm() {
  const studentOpts = cachedStudents.length
    ? cachedStudents.map(s => `<option value="${s.STUDENT_ID}">${s.FULL_NAME} (${s.ROLL_NO})</option>`).join('')
    : '<option value="">— load students first —</option>';

  const eventOpts = cachedEvents.length
    ? cachedEvents.map(e => `<option value="${e.EVENT_ID}">${e.EVENT_TITLE}</option>`).join('')
    : '<option value="">— load events first —</option>';

  const today = new Date().toISOString().split('T')[0];

  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Registration ID *</label>
        <input class="form-control" id="f_reg_id" type="number" value="${genId()}">
      </div>
      <div class="form-group">
        <label class="form-label">Registration Date *</label>
        <input class="form-control" id="f_reg_date" type="date" value="${today}">
      </div>
      <div class="form-group full">
        <label class="form-label">Student *</label>
        <select class="form-control" id="f_reg_student_id">
          <option value="">Select student</option>
          ${studentOpts}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Event *</label>
        <select class="form-control" id="f_reg_event_id">
          <option value="">Select event</option>
          ${eventOpts}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Note</label>
        <div class="form-control" style="background:var(--surface-2);">
          Status is automatic: paid events -> PENDING + payment entry, free events -> REGISTERED.
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="regSubmitBtn">Register</button>
    </div>`;
}

async function submitAddRegistration() {
  const studentId = parseInt(document.getElementById('f_reg_student_id').value);
  const eventId   = parseInt(document.getElementById('f_reg_event_id').value);

  if (!studentId || !eventId) {
    showToast('Please select a student and event', 'error'); return;
  }

  const body = {
    registration_id:   parseInt(document.getElementById('f_reg_id').value),
    student_id:        studentId,
    event_id:          eventId,
    registration_date: document.getElementById('f_reg_date').value,
  };

  try {
    const res = await apiPost('/api/registrations', body);
    const paymentNote = res.payment_created ? ` | Payment ID: ${res.payment_id}` : '';
    showToast(`Registration successful | Status: ${res.status}${paymentNote}`);
    closeModal();
    loadRegistrations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openEditRegistration(registrationId) {
  const reg = cachedRegistrations.find(r => r.REGISTRATION_ID === registrationId);
  if (!reg) return showToast('Registration not found', 'error');

  const isPaidEvent = Number(reg.FEE || 0) > 0;
  const paymentStatus = String(reg.PAYMENT_STATUS || '').toUpperCase();
  const paymentPending = isPaidEvent && (!paymentStatus || paymentStatus === 'PENDING');
  const allowedStatuses = paymentPending
    ? ['PENDING', 'REGISTERED']
    : ['PENDING', 'REGISTERED', 'CONFIRMED', 'CANCELLED', 'ATTENDED'];

  let teamMembersBlock = `<div style="margin-top:8px; color:var(--text-3);">No team attached to this registration.</div>`;
  if (reg.TEAM_ID) {
    try {
      const teamRes = await apiGet(`/api/teams/${reg.TEAM_ID}/members`);
      const team = teamRes.data?.team || {};
      const members = teamRes.data?.members || [];
      const memberList = members.length
        ? members.map(m => `${m.FULL_NAME} (${m.ROLL_NO})${m.STUDENT_ID === team.LEADER_STUDENT_ID ? ' [Leader]' : ''}`).join('<br>')
        : 'No members found';
      teamMembersBlock = `
        <div style="margin-top:8px;">
          <div><b>Team:</b> ${fmt(team.TEAM_NAME)} (ID ${fmt(team.TEAM_ID)})</div>
          <div><b>Leader:</b> ${fmt(team.LEADER_NAME)} (ID ${fmt(team.LEADER_STUDENT_ID)})</div>
          <div style="margin-top:4px;"><b>Members:</b><br>${memberList}</div>
        </div>
      `;
    } catch (err) {
      teamMembersBlock = `<div style="margin-top:8px; color:var(--rose);">Failed to load team members: ${err.message}</div>`;
    }
  }

  openModal('Edit Registration Status', `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Registration ID</label>
        <input class="form-control" type="text" value="${reg.REGISTRATION_ID}" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Status *</label>
        <select class="form-control" id="f_reg_edit_status">
          ${allowedStatuses.map(s =>
            `<option value="${s}" ${String(reg.STATUS || '').toUpperCase() === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Payment / Rules</label>
        <div class="form-control" style="background:var(--surface-2);">
          Event Fee: ${Number(reg.FEE || 0) > 0 ? `₹${Number(reg.FEE).toLocaleString('en-IN')}` : 'Free'}<br>
          Payment Status: ${fmt(reg.PAYMENT_STATUS, 'N/A')}<br>
          ${paymentPending ? 'Only PENDING or REGISTERED allowed until payment status changes.' : 'All edit statuses are available.'}
        </div>
      </div>
      <div class="form-group full">
        <label class="form-label">Team Members</label>
        <div class="form-control" style="background:var(--surface-2);">
          ${teamMembersBlock}
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="regEditSubmitBtn">Update Status</button>
    </div>
  `);

  document.getElementById('regEditSubmitBtn').addEventListener('click', () => submitEditRegistration(registrationId));
}

async function submitEditRegistration(registrationId) {
  const status = document.getElementById('f_reg_edit_status').value;
  try {
    await apiPatch(`/api/registrations/${registrationId}`, { status });
    showToast('Registration updated successfully');
    closeModal();
    loadRegistrations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteRegistration(registrationId) {
  if (!confirm(`Delete registration ID ${registrationId}?`)) return;
  try {
    await apiDelete(`/api/registrations/${registrationId}`);
    showToast('Registration deleted');
    loadRegistrations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   PAYMENTS
   ============================================================ */
async function loadPayments() {
  const tbody = document.getElementById('paymentsBody');
  tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Loading…</td></tr>`;
  try {
    const res = await apiGet('/api/payments');
    const pays = res.data || [];
    renderPaymentsTable(pays);
    setupSearch('searchPayments', 'paymentsBody');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Error: ${err.message}</td></tr>`;
    showToast('Failed to load payments: ' + err.message, 'error');
  }
}

function renderPaymentsTable(pays) {
  const tbody = document.getElementById('paymentsBody');
  if (!pays.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No payments found</td></tr>`;
    return;
  }
  tbody.innerHTML = pays.map(p => `
    <tr>
      <td><span class="mono">${p.PAYMENT_ID}</span></td>
      <td><span class="mono">${p.REGISTRATION_ID}</span></td>
      <td>${fmt(p.FULL_NAME)}</td>
      <td class="truncate">${fmt(p.EVENT_TITLE)}</td>
      <td><b>₹${Number(p.AMOUNT).toLocaleString('en-IN')}</b></td>
      <td>${fmt(p.PAYMENT_MODE)}</td>
      <td>${badge(p.PAYMENT_STATUS)}</td>
      <td>${fmtDate(p.PAYMENT_DATE)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" onclick="openEditPayment(${p.PAYMENT_ID})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePayment(${p.PAYMENT_ID})">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('btnAddPayment').addEventListener('click', () => {
  openModal('Record Payment', paymentForm());
  document.getElementById('paySubmitBtn').addEventListener('click', submitAddPayment);
});

function paymentForm() {
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Payment ID *</label>
        <input class="form-control" id="f_pay_id" type="number" value="${genId()}">
      </div>
      <div class="form-group">
        <label class="form-label">Registration ID *</label>
        <input class="form-control" id="f_pay_reg_id" type="number" placeholder="From registrations table">
      </div>
      <div class="form-group">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-control" id="f_pay_amount" type="number" step="0.01" placeholder="0.00">
      </div>
      <div class="form-group">
        <label class="form-label">Payment Mode *</label>
        <select class="form-control" id="f_pay_mode">
          <option value="UPI">UPI</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="ONLINE">Online</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Payment Status</label>
        <select class="form-control" id="f_pay_status">
          <option value="PENDING">Pending</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Payment Date *</label>
        <input class="form-control" id="f_pay_date" type="date" value="${today}">
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="paySubmitBtn">Record Payment</button>
    </div>`;
}

async function submitAddPayment() {
  const regId  = parseInt(document.getElementById('f_pay_reg_id').value);
  const amount = parseFloat(document.getElementById('f_pay_amount').value);

  if (!regId || isNaN(amount) || amount <= 0) {
    showToast('Please fill in all required fields correctly', 'error'); return;
  }

  const body = {
    payment_id:     parseInt(document.getElementById('f_pay_id').value),
    registration_id: regId,
    amount:          amount,
    payment_mode:    document.getElementById('f_pay_mode').value,
    payment_status:  document.getElementById('f_pay_status').value,
    payment_date:    document.getElementById('f_pay_date').value,
  };

  try {
    await apiPost('/api/payments', body);
    showToast('Payment recorded successfully');
    closeModal();
    loadPayments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function openEditPayment(paymentId) {
  let payment;
  try {
    const res = await apiGet(`/api/payments/${paymentId}`);
    payment = res.data;
  } catch (err) {
    showToast(`Failed to load payment: ${err.message}`, 'error');
    return;
  }

  let teamDetails = `No team linked to this registration (individual registration).`;
  if (payment.TEAM_ID) {
    try {
      const teamRes = await apiGet(`/api/teams/${payment.TEAM_ID}/members`);
      const team = teamRes.data?.team || {};
      const members = teamRes.data?.members || [];
      const memberList = members.length
        ? members.map(m => `${m.FULL_NAME} (${m.ROLL_NO})${m.STUDENT_ID === team.LEADER_STUDENT_ID ? ' [Leader]' : ''}`).join('<br>')
        : 'No members found';
      teamDetails = `
        <div><b>Team:</b> ${fmt(team.TEAM_NAME)} (ID ${fmt(team.TEAM_ID)})</div>
        <div><b>Leader:</b> ${fmt(team.LEADER_NAME)} (ID ${fmt(team.LEADER_STUDENT_ID)})</div>
        <div style="margin-top:4px;"><b>Members:</b><br>${memberList}</div>
      `;
    } catch (err) {
      teamDetails = `Failed to load team members: ${err.message}`;
    }
  }

  openModal('Edit Payment', `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Payment ID</label>
        <input class="form-control" id="f_pay_edit_id" type="number" value="${payment.PAYMENT_ID}" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Registration ID *</label>
        <input class="form-control" id="f_pay_edit_reg_id" type="number" value="${payment.REGISTRATION_ID}">
      </div>
      <div class="form-group">
        <label class="form-label">Amount (₹) *</label>
        <input class="form-control" id="f_pay_edit_amount" type="number" step="0.01" value="${payment.AMOUNT}">
      </div>
      <div class="form-group">
        <label class="form-label">Payment Mode *</label>
        <select class="form-control" id="f_pay_edit_mode">
          ${['UPI', 'CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE'].map(m =>
            `<option value="${m}" ${String(payment.PAYMENT_MODE || '').toUpperCase() === m ? 'selected' : ''}>${m}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Payment Status *</label>
        <select class="form-control" id="f_pay_edit_status">
          ${['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'].map(s =>
            `<option value="${s}" ${String(payment.PAYMENT_STATUS || '').toUpperCase() === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Payment Date *</label>
        <input class="form-control" id="f_pay_edit_date" type="date" value="${payment.PAYMENT_DATE ? String(payment.PAYMENT_DATE).split('T')[0] : ''}">
      </div>
      <div class="form-group full">
        <label class="form-label">Registration Status</label>
        <select class="form-control" id="f_pay_edit_reg_status">
          ${['PENDING', 'REGISTERED', 'CONFIRMED', 'CANCELLED', 'ATTENDED'].map(s =>
            `<option value="${s}" ${String(payment.REGISTRATION_STATUS || '').toUpperCase() === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Team Details</label>
        <div class="form-control" style="background:var(--surface-2);">
          <div><b>Event:</b> ${fmt(payment.EVENT_TITLE)} (ID ${fmt(payment.EVENT_ID)})</div>
          <div style="margin-top:6px;">${teamDetails}</div>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="payEditSubmitBtn">Save Payment</button>
    </div>
  `);

  document.getElementById('payEditSubmitBtn').addEventListener('click', () => submitEditPayment(paymentId));
}

async function submitEditPayment(paymentId) {
  const registrationId = parseInt(document.getElementById('f_pay_edit_reg_id').value);
  const amount = parseFloat(document.getElementById('f_pay_edit_amount').value);
  const paymentMode = document.getElementById('f_pay_edit_mode').value;
  const paymentStatus = document.getElementById('f_pay_edit_status').value;
  const paymentDate = document.getElementById('f_pay_edit_date').value;
  const registrationStatus = document.getElementById('f_pay_edit_reg_status').value;

  if (!registrationId || Number.isNaN(amount) || amount <= 0 || !paymentDate) {
    showToast('Please fill in payment fields correctly', 'error'); return;
  }

  try {
    await apiPut(`/api/payments/${paymentId}`, {
      registration_id: registrationId,
      amount,
      payment_mode: paymentMode,
      payment_status: paymentStatus,
      payment_date: paymentDate,
    });

    try {
      await apiPatch(`/api/registrations/${registrationId}`, { status: registrationStatus });
      showToast('Payment and registration status updated');
    } catch (err) {
      showToast(`Payment updated, but registration status not updated: ${err.message}`, 'error');
    }

    closeModal();
    loadPayments();
    loadRegistrations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deletePayment(paymentId) {
  if (!confirm(`Delete payment ID ${paymentId}?`)) return;
  try {
    await apiDelete(`/api/payments/${paymentId}`);
    showToast('Payment deleted');
    loadPayments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   FEEDBACK
   ============================================================ */
async function loadFeedback() {
  const tbody = document.getElementById('feedbackBody');
  tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Loading…</td></tr>`;
  try {
    const res = await apiGet('/api/feedback');
    const fbs = res.data || [];
    renderFeedbackTable(fbs);
    setupSearch('searchFeedback', 'feedbackBody');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Error: ${err.message}</td></tr>`;
    showToast('Failed to load feedback: ' + err.message, 'error');
  }
}

function renderFeedbackTable(fbs) {
  const tbody = document.getElementById('feedbackBody');
  if (!fbs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No feedback found</td></tr>`;
    return;
  }
  tbody.innerHTML = fbs.map(f => `
    <tr>
      <td><span class="mono">${f.FEEDBACK_ID}</span></td>
      <td>${fmt(f.FULL_NAME)}</td>
      <td class="truncate">${fmt(f.EVENT_TITLE)}</td>
      <td>${stars(f.RATING)}</td>
      <td class="truncate" style="max-width:200px">${fmt(f.COMMENTS)}</td>
      <td>${fmtDate(f.SUBMITTED_DATE)}</td>
    </tr>`).join('');
}

document.getElementById('btnAddFeedback').addEventListener('click', () => {
  openModal('Submit Feedback', feedbackForm());
  document.getElementById('fbSubmitBtn').addEventListener('click', submitAddFeedback);
});

function feedbackForm() {
  const studentOpts = cachedStudents.length
    ? cachedStudents.map(s => `<option value="${s.STUDENT_ID}">${s.FULL_NAME} (${s.ROLL_NO})</option>`).join('')
    : '<option value="">— load students first —</option>';

  const eventOpts = cachedEvents.length
    ? cachedEvents.map(e => `<option value="${e.EVENT_ID}">${e.EVENT_TITLE}</option>`).join('')
    : '<option value="">— load events first —</option>';

  const today = new Date().toISOString().split('T')[0];

  return `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Feedback ID *</label>
        <input class="form-control" id="f_fb_id" type="number" value="${genId()}">
      </div>
      <div class="form-group">
        <label class="form-label">Registration ID *</label>
        <input class="form-control" id="f_fb_reg_id" type="number" placeholder="Must match student+event">
      </div>
      <div class="form-group full">
        <label class="form-label">Student *</label>
        <select class="form-control" id="f_fb_student_id">
          <option value="">Select student</option>
          ${studentOpts}
        </select>
      </div>
      <div class="form-group full">
        <label class="form-label">Event *</label>
        <select class="form-control" id="f_fb_event_id">
          <option value="">Select event</option>
          ${eventOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Rating (1–5) *</label>
        <select class="form-control" id="f_fb_rating">
          <option value="">Select rating</option>
          <option value="5">★★★★★ Excellent</option>
          <option value="4">★★★★☆ Good</option>
          <option value="3">★★★☆☆ Average</option>
          <option value="2">★★☆☆☆ Poor</option>
          <option value="1">★☆☆☆☆ Very Poor</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Submitted Date *</label>
        <input class="form-control" id="f_fb_date" type="date" value="${today}">
      </div>
      <div class="form-group full">
        <label class="form-label">Comments</label>
        <textarea class="form-control" id="f_fb_comments" placeholder="Your feedback about the event…"></textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="fbSubmitBtn">Submit Feedback</button>
    </div>`;
}

async function submitAddFeedback() {
  const studentId = parseInt(document.getElementById('f_fb_student_id').value);
  const eventId   = parseInt(document.getElementById('f_fb_event_id').value);
  const regId     = parseInt(document.getElementById('f_fb_reg_id').value);
  const rating    = parseInt(document.getElementById('f_fb_rating').value);

  if (!studentId || !eventId || !regId || !rating) {
    showToast('Please fill in all required fields', 'error'); return;
  }

  const body = {
    feedback_id:     parseInt(document.getElementById('f_fb_id').value),
    registration_id: regId,
    student_id:      studentId,
    event_id:        eventId,
    rating:          rating,
    comments:        document.getElementById('f_fb_comments').value.trim() || null,
    submitted_date:  document.getElementById('f_fb_date').value,
  };

  try {
    await apiPost('/api/feedback', body);
    showToast('Feedback submitted successfully');
    closeModal();
    loadFeedback();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  // Pre-load students & events for dropdowns
  try {
    const [sRes, eRes, tRes] = await Promise.all([
      apiGet('/api/students'),
      apiGet('/api/events'),
      apiGet('/api/teams'),
    ]);
    cachedStudents = sRes.data || [];
    cachedEvents   = eRes.data || [];
    cachedTeams    = tRes.data || [];
  } catch (_) { /* silent — will retry on page load */ }

  navigateTo('dashboard');
}

init();
