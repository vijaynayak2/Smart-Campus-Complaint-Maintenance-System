/**
 * Maintenance Staff Dashboard Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth(['staff', 'admin'])) return;
  Auth.setupNavbarUser();

  let assignedTasks = [];
  let currentTaskForResolution = null;

  // Elements
  const statAssigned = document.getElementById('statAssigned');
  const statPending = document.getElementById('statPending');
  const statInProgress = document.getElementById('statInProgress');
  const statResolved = document.getElementById('statResolved');

  const tasksContainer = document.getElementById('tasksContainer');
  const tasksEmptyState = document.getElementById('tasksEmptyState');
  const tasksLoadingState = document.getElementById('tasksLoadingState');

  const filterStatusSelect = document.getElementById('filterStaffStatus');
  const searchInput = document.getElementById('taskSearch');
  const btnRefresh = document.getElementById('btnRefresh');

  // Resolution modal elements
  const modalResolveEl = document.getElementById('modalResolveTask');
  const modalResolve = new bootstrap.Modal(modalResolveEl);
  const formResolveTask = document.getElementById('formResolveTask');
  const resolveRemarks = document.getElementById('resolveRemarks');
  const resolveProofImage = document.getElementById('resolveProofImage');
  const proofPreviewContainer = document.getElementById('proofPreviewContainer');
  const proofPreview = document.getElementById('proofPreview');
  const btnRemoveProofPreview = document.getElementById('btnRemoveProofPreview');
  const btnSubmitResolve = document.getElementById('btnSubmitResolve');

  // Proof image preview
  if (resolveProofImage) {
    resolveProofImage.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          showToast('Please select a valid image file', 'warning');
          this.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
          proofPreview.src = e.target.result;
          proofPreviewContainer.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
      }
    });

    btnRemoveProofPreview.addEventListener('click', function(e) {
      e.stopPropagation();
      resolveProofImage.value = '';
      proofPreview.src = '';
      proofPreviewContainer.classList.add('d-none');
    });
  }

  // Load staff tasks
  async function loadTasks() {
    tasksLoadingState.classList.remove('d-none');
    tasksEmptyState.classList.add('d-none');
    tasksContainer.innerHTML = '';

    try {
      const res = await API.get('/api/complaints');
      assignedTasks = res.complaints || [];

      updateStats(assignedTasks);
      renderFilteredTasks();
    } catch (err) {
      showToast(err.message || 'Failed to load assigned tasks', 'error');
    } finally {
      tasksLoadingState.classList.add('d-none');
    }
  }

  function updateStats(list) {
    const total = list.length;
    const pending = list.filter(t => t.status === 'Assigned').length;
    const inProgress = list.filter(t => t.status === 'In Progress').length;
    const resolved = list.filter(t => t.status === 'Resolved' || t.status === 'Verified').length;

    if (statAssigned) statAssigned.textContent = total;
    if (statPending) statPending.textContent = pending;
    if (statInProgress) statInProgress.textContent = inProgress;
    if (statResolved) statResolved.textContent = resolved;
  }

  function renderFilteredTasks() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusVal = filterStatusSelect ? filterStatusSelect.value : 'all';

    const filtered = assignedTasks.filter(t => {
      const matchSearch = !searchTerm ||
        t.complaint_code.toLowerCase().includes(searchTerm) ||
        t.title.toLowerCase().includes(searchTerm) ||
        t.location.toLowerCase().includes(searchTerm) ||
        t.description.toLowerCase().includes(searchTerm);

      const matchStatus = statusVal === 'all' || t.status === statusVal;

      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tasksContainer.innerHTML = '';
      tasksEmptyState.classList.remove('d-none');
      return;
    }

    tasksEmptyState.classList.add('d-none');
    tasksContainer.innerHTML = filtered.map(t => renderTaskCard(t)).join('');

    // Attach Action Listeners
    // 1. Start Work button (Assigned -> In Progress)
    tasksContainer.querySelectorAll('.btn-start-work').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const code = btn.getAttribute('data-code');
        await startWork(id, code, btn);
      });
    });

    // 2. Open Resolve Modal (In Progress -> Resolved)
    tasksContainer.querySelectorAll('.btn-open-resolve').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const task = assignedTasks.find(t => String(t.id) === String(id));
        if (task) openResolveModal(task);
      });
    });

    // 3. View Details
    tasksContainer.querySelectorAll('.btn-view-task-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openTaskDetailModal(id);
      });
    });
  }

  function getStatusBadge(status) {
    const s = (status || '').toLowerCase().replace(' ', '-');
    let icon = 'bi-circle';
    if (status === 'Assigned') icon = 'bi-person-gear';
    else if (status === 'In Progress') icon = 'bi-gear-wide-connected';
    else if (status === 'Resolved') icon = 'bi-check2-circle';
    else if (status === 'Verified') icon = 'bi-award-fill';

    return `<span class="badge-status badge-status-${s}"><i class="bi ${icon}"></i> ${status}</span>`;
  }

  function getPriorityBadge(priority) {
    const p = (priority || 'medium').toLowerCase();
    return `<span class="badge-priority badge-priority-${p}">${priority}</span>`;
  }

  function renderTaskCard(t) {
    const isCritical = t.priority === 'Critical';
    const borderClass = isCritical ? 'border-danger border-2' : 'border';

    let actionBtnHtml = '';
    if (t.status === 'Assigned') {
      actionBtnHtml = `
        <button class="btn btn-warning btn-sm fw-bold text-dark btn-start-work shadow-sm" data-id="${t.id}" data-code="${t.complaint_code}">
          <i class="bi bi-play-circle-fill me-1"></i>Start Work (In Progress)
        </button>
      `;
    } else if (t.status === 'In Progress') {
      actionBtnHtml = `
        <button class="btn btn-success btn-sm fw-bold btn-open-resolve shadow-sm" data-id="${t.id}">
          <i class="bi bi-camera-fill me-1"></i>Mark Resolved & Upload Proof
        </button>
      `;
    } else if (t.status === 'Resolved') {
      actionBtnHtml = `
        <span class="badge bg-success-subtle text-success py-2 px-3 fw-bold small">
          <i class="bi bi-clock-history me-1"></i>Awaiting Admin Verification
        </span>
      `;
    } else if (t.status === 'Verified') {
      actionBtnHtml = `
        <span class="badge bg-info-subtle text-info-emphasis py-2 px-3 fw-bold small">
          <i class="bi bi-check-all me-1"></i>Verified & Closed by Admin
        </span>
      `;
    }

    return `
      <div class="col-12 col-lg-6 mb-4">
        <div class="card h-100 ${borderClass} shadow-sm rounded-4 bg-white">
          <div class="card-body p-4 d-flex flex-column">

            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="badge bg-light text-primary border fw-bold px-2 py-1">
                <i class="bi bi-tag-fill me-1"></i>${t.complaint_code}
              </span>
              <div class="d-flex gap-1 align-items-center">
                ${getPriorityBadge(t.priority)}
                ${getStatusBadge(t.status)}
              </div>
            </div>

            <h5 class="fw-bold text-dark mb-2">${t.title}</h5>

            <div class="small text-muted mb-2">
              <i class="bi bi-geo-alt-fill text-danger me-1"></i><strong>Location:</strong> ${t.location}
            </div>

            <div class="bg-light rounded-3 p-3 mb-3 small">
              <div class="fw-semibold text-dark mb-1">Issue Details:</div>
              <p class="text-secondary mb-2">${t.description}</p>
              <div class="d-flex justify-content-between text-muted" style="font-size: 0.75rem;">
                <span><i class="bi bi-person me-1"></i>${t.submitter_name} (${t.submitter_dept || 'AJIET'})</span>
                ${t.submitter_phone ? `<span><i class="bi bi-telephone me-1"></i>${t.submitter_phone}</span>` : ''}
              </div>
            </div>

            <!-- Original Photo Thumbnail if available -->
            ${t.image_url ? `
              <div class="mb-3 d-flex align-items-center gap-2">
                <a href="${t.image_url}" target="_blank">
                  <img src="${t.image_url}" class="complaint-thumb" alt="Reported problem">
                </a>
                <small class="text-muted"><i class="bi bi-image me-1"></i>Reported Photo Attached (Click to enlarge)</small>
              </div>
            ` : ''}

            <!-- Proof Photo Thumbnail if resolved -->
            ${t.proof_image ? `
              <div class="mb-3 p-2 bg-success-subtle rounded-3 d-flex align-items-center gap-2">
                <a href="${t.proof_image}" target="_blank">
                  <img src="${t.proof_image}" class="complaint-thumb border-success" alt="Proof photo">
                </a>
                <div class="small text-success">
                  <span class="fw-bold d-block"><i class="bi bi-patch-check me-1"></i>Proof Photo Uploaded</span>
                  <span class="text-muted" style="font-size: 0.72rem;">${t.resolution_remarks || 'Work completed.'}</span>
                </div>
              </div>
            ` : ''}

            <div class="mt-auto pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                ${actionBtnHtml}
              </div>
              <button class="btn btn-outline-secondary btn-sm btn-view-task-detail" data-id="${t.id}">
                <i class="bi bi-clock-history me-1"></i>Timeline
              </button>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  // Action: Transition Assigned -> In Progress
  async function startWork(id, code, btn) {
    if (!confirm(`Confirm starting maintenance work on #${code}?`)) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Updating...';

    try {
      const res = await API.post(`/api/complaints/${id}/status`, {
        status: 'In Progress',
        remarks: 'Maintenance staff commenced diagnosis and repair on-site.'
      });

      showToast(res.message || 'Status updated to In Progress!', 'success');
      loadTasks();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-play-circle-fill me-1"></i>Start Work';
    }
  }

  // Open Resolution Modal
  function openResolveModal(task) {
    currentTaskForResolution = task;
    document.getElementById('resolveTaskCode').textContent = task.complaint_code;
    document.getElementById('resolveTaskTitle').textContent = task.title;
    resolveRemarks.value = '';
    resolveProofImage.value = '';
    proofPreview.src = '';
    proofPreviewContainer.classList.add('d-none');

    modalResolve.show();
  }

  // Submit Resolution & Proof Photo
  formResolveTask.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentTaskForResolution) return;

    const remarks = resolveRemarks.value.trim();
    const file = resolveProofImage.files[0];

    if (!remarks) {
      showToast('Please provide remarks explaining what was repaired.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('status', 'Resolved');
    formData.append('remarks', remarks);
    if (file) {
      formData.append('proof_image', file);
    }

    btnSubmitResolve.disabled = true;
    btnSubmitResolve.querySelector('.btn-text').classList.add('d-none');
    btnSubmitResolve.querySelector('.spinner-border').classList.remove('d-none');

    try {
      const res = await API.postMultipart(`/api/complaints/${currentTaskForResolution.id}/status`, formData);
      showToast(res.message || 'Work marked as Resolved! Proof photo submitted.', 'success');

      modalResolve.hide();
      loadTasks();
    } catch (err) {
      showToast(err.message || 'Failed to submit resolution', 'error');
    } finally {
      btnSubmitResolve.disabled = false;
      btnSubmitResolve.querySelector('.btn-text').classList.remove('d-none');
      btnSubmitResolve.querySelector('.spinner-border').classList.add('d-none');
    }
  });

  // Open Task Detail & Timeline Modal
  async function openTaskDetailModal(id) {
    const modalEl = document.getElementById('modalStaffTaskDetail');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const bodyEl = document.getElementById('staffTaskDetailBody');
    bodyEl.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
    `;

    try {
      const res = await API.get(`/api/complaints/${id}`);
      const t = res.complaint;
      const timeline = res.timeline || [];

      bodyEl.innerHTML = `
        <div class="border-bottom pb-3 mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <h5 class="fw-bold mb-0">${t.title}</h5>
            <span class="badge bg-light text-primary border">${t.complaint_code}</span>
          </div>
          <div class="small text-muted mb-2"><i class="bi bi-geo-alt text-danger me-1"></i>${t.location}</div>
          <div class="d-flex gap-2">
            ${getStatusBadge(t.status)}
            ${getPriorityBadge(t.priority)}
          </div>
        </div>

        <!-- Before & After Comparison -->
        <div class="row g-3 mb-4">
          <div class="col-6">
            <div class="border rounded-3 p-2 bg-light text-center">
              <span class="small fw-bold d-block mb-1 text-muted">Original Issue Photo</span>
              ${t.image_url ? `
                <a href="${t.image_url}" target="_blank">
                  <img src="${t.image_url}" class="img-fluid rounded" style="max-height: 140px; object-fit: cover;" alt="Reported issue">
                </a>
              ` : '<div class="py-4 text-muted small">No photo attached by student</div>'}
            </div>
          </div>
          <div class="col-6">
            <div class="border rounded-3 p-2 bg-success-subtle text-center">
              <span class="small fw-bold d-block mb-1 text-success">Completion Proof Photo</span>
              ${t.proof_image ? `
                <a href="${t.proof_image}" target="_blank">
                  <img src="${t.proof_image}" class="img-fluid rounded" style="max-height: 140px; object-fit: cover;" alt="Proof photo">
                </a>
              ` : '<div class="py-4 text-muted small">Not uploaded yet</div>'}
            </div>
          </div>
        </div>

        <h6 class="fw-bold small text-uppercase text-muted mb-2">Timeline Activity</h6>
        <div class="timeline-list">
          ${timeline.map(item => `
            <div class="timeline-item">
              <div class="timeline-bullet"><i class="bi bi-dot"></i></div>
              <div class="timeline-content">
                <div class="d-flex justify-content-between">
                  <strong class="small">${item.status}</strong>
                  <span class="text-muted" style="font-size: 0.72rem;">${new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div class="small text-secondary mt-1">${item.remarks || ''}</div>
                <div class="small text-muted" style="font-size: 0.72rem;">By ${item.user_name} (${item.user_role})</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      bodyEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  }

  // Filter Listeners
  if (filterStatusSelect) filterStatusSelect.addEventListener('change', renderFilteredTasks);
  if (searchInput) searchInput.addEventListener('input', renderFilteredTasks);
  if (btnRefresh) btnRefresh.addEventListener('click', loadTasks);

  // Initial load
  loadTasks();
});
