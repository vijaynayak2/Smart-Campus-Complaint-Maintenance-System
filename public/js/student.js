/**
 * Student / Regular User Dashboard Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure authenticated as student (or admin/staff browsing user portal)
  if (!Auth.requireAuth()) return;
  Auth.setupNavbarUser();

  let allComplaints = [];

  // Elements
  const statsTotal = document.getElementById('statTotal');
  const statsPending = document.getElementById('statPending');
  const statsInProgress = document.getElementById('statInProgress');
  const statsResolved = document.getElementById('statResolved');

  const complaintsContainer = document.getElementById('complaintsContainer');
  const complaintsEmptyState = document.getElementById('complaintsEmptyState');
  const complaintsLoadingState = document.getElementById('complaintsLoadingState');

  const searchInput = document.getElementById('complaintSearch');
  const statusFilter = document.getElementById('filterStatus');
  const categoryFilter = document.getElementById('filterCategory');
  const btnRefresh = document.getElementById('btnRefresh');

  // Submit modal elements
  const formSubmitComplaint = document.getElementById('formSubmitComplaint');
  const btnSubmitModal = document.getElementById('btnSubmitModal');
  const complaintImageInput = document.getElementById('complaintImage');
  const imgPreviewContainer = document.getElementById('imgPreviewContainer');
  const imgPreview = document.getElementById('imgPreview');
  const btnRemoveImgPreview = document.getElementById('btnRemoveImgPreview');

  // Image preview handler
  if (complaintImageInput) {
    complaintImageInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          showToast('Please select a valid image file (JPG, PNG, WEBP)', 'warning');
          this.value = '';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          showToast('Image size cannot exceed 5MB', 'warning');
          this.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
          imgPreview.src = e.target.result;
          imgPreviewContainer.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
      }
    });

    btnRemoveImgPreview.addEventListener('click', function(e) {
      e.stopPropagation();
      complaintImageInput.value = '';
      imgPreview.src = '';
      imgPreviewContainer.classList.add('d-none');
    });
  }

  // Load complaints from API
  async function loadComplaints() {
    complaintsLoadingState.classList.remove('d-none');
    complaintsEmptyState.classList.add('d-none');
    complaintsContainer.innerHTML = '';

    try {
      const res = await API.get('/api/complaints');
      allComplaints = res.complaints || [];

      updateStats(allComplaints);
      renderFilteredComplaints();
    } catch (err) {
      showToast(err.message || 'Failed to load complaints', 'error');
    } finally {
      complaintsLoadingState.classList.add('d-none');
    }
  }

  // Update Stat Cards
  function updateStats(list) {
    const total = list.length;
    const pending = list.filter(c => c.status === 'Submitted' || c.status === 'Assigned').length;
    const inProgress = list.filter(c => c.status === 'In Progress').length;
    const resolved = list.filter(c => c.status === 'Resolved' || c.status === 'Verified').length;

    if (statsTotal) statsTotal.textContent = total;
    if (statsPending) statsPending.textContent = pending;
    if (statsInProgress) statsInProgress.textContent = inProgress;
    if (statsResolved) statsResolved.textContent = resolved;
  }

  // Filter complaints client-side for instant responsiveness
  function renderFilteredComplaints() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const categoryVal = categoryFilter ? categoryFilter.value : 'all';

    const filtered = allComplaints.filter(c => {
      const matchSearch = !searchTerm ||
        c.complaint_code.toLowerCase().includes(searchTerm) ||
        c.title.toLowerCase().includes(searchTerm) ||
        c.location.toLowerCase().includes(searchTerm) ||
        c.description.toLowerCase().includes(searchTerm);

      const matchStatus = statusVal === 'all' || c.status === statusVal;
      const matchCategory = categoryVal === 'all' || c.category === categoryVal;

      return matchSearch && matchStatus && matchCategory;
    });

    if (filtered.length === 0) {
      complaintsContainer.innerHTML = '';
      complaintsEmptyState.classList.remove('d-none');
      return;
    }

    complaintsEmptyState.classList.add('d-none');
    complaintsContainer.innerHTML = filtered.map(c => renderComplaintCard(c)).join('');

    // Attach click handlers to open details
    complaintsContainer.querySelectorAll('.btn-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openComplaintDetailModal(id);
      });
    });
  }

  function getStatusBadge(status) {
    const s = (status || '').toLowerCase().replace(' ', '-');
    let icon = 'bi-circle';
    if (status === 'Submitted') icon = 'bi-file-earmark-plus';
    else if (status === 'Assigned') icon = 'bi-person-gear';
    else if (status === 'In Progress') icon = 'bi-gear-wide-connected';
    else if (status === 'Resolved') icon = 'bi-check2-circle';
    else if (status === 'Verified') icon = 'bi-award-fill';

    return `<span class="badge-status badge-status-${s}"><i class="bi ${icon}"></i> ${status}</span>`;
  }

  function getPriorityBadge(priority) {
    const p = (priority || 'medium').toLowerCase();
    return `<span class="badge-priority badge-priority-${p}">${priority}</span>`;
  }

  function getCategoryIcon(cat) {
    switch (cat) {
      case 'Electrical': return 'bi-lightning-charge-fill text-warning';
      case 'Plumbing': return 'bi-droplet-fill text-info';
      case 'Wi-Fi & Network': return 'bi-wifi text-primary';
      case 'Damaged Furniture': return 'bi-grid-3x2-gap-fill text-success';
      case 'Classroom Equipment': return 'bi-easel-fill text-danger';
      case 'Cleanliness & Sanitation': return 'bi-trash3-fill text-secondary';
      case 'Water Leakage': return 'bi-cloud-rain-heavy-fill text-primary';
      default: return 'bi-building-gear text-dark';
    }
  }

  // Render individual complaint card
  function renderComplaintCard(c) {
    const formattedDate = new Date(c.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="col-12 col-md-6 col-xl-4 mb-4">
        <div class="card h-100 border shadow-sm rounded-4 complaint-item-card position-relative overflow-hidden bg-white">
          <div class="card-body p-4 d-flex flex-column">
            
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge bg-light text-primary border fw-bold px-2 py-1">
                <i class="bi bi-tag-fill me-1"></i>${c.complaint_code}
              </span>
              <div class="d-flex gap-1 align-items-center">
                ${getPriorityBadge(c.priority)}
                ${getStatusBadge(c.status)}
              </div>
            </div>

            <h5 class="fw-bold text-dark mt-2 mb-2 fs-6 line-clamp-2">${c.title}</h5>

            <p class="small text-muted mb-3 text-truncate" style="max-height: 40px;">
              ${c.description}
            </p>

            <div class="mt-auto pt-2 border-top">
              <div class="small text-muted mb-1 d-flex align-items-center gap-1">
                <i class="bi ${getCategoryIcon(c.category)}"></i>
                <span class="fw-semibold text-dark">${c.category}</span>
              </div>
              <div class="small text-muted mb-2 text-truncate">
                <i class="bi bi-geo-alt text-danger me-1"></i>${c.location}
              </div>
              
              <div class="d-flex justify-content-between align-items-center pt-2">
                <small class="text-muted" style="font-size: 0.75rem;">
                  <i class="bi bi-clock me-1"></i>${formattedDate}
                </small>
                <button class="btn btn-sm btn-outline-primary fw-semibold btn-view-detail px-3" data-id="${c.id}">
                  Timeline <i class="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  // Handle New Complaint Submission
  formSubmitComplaint.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('compTitle').value.trim();
    const category = document.getElementById('compCategory').value;
    const location = document.getElementById('compLocation').value.trim();
    const priority = document.getElementById('compPriority').value;
    const description = document.getElementById('compDescription').value.trim();
    const file = complaintImageInput.files[0];

    if (!title || !category || !location || !description) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('location', location);
    formData.append('priority', priority);
    formData.append('description', description);
    if (file) {
      formData.append('image', file);
    }

    // UI State
    btnSubmitModal.disabled = true;
    btnSubmitModal.querySelector('.btn-text').classList.add('d-none');
    btnSubmitModal.querySelector('.spinner-border').classList.remove('d-none');

    try {
      const res = await API.postMultipart('/api/complaints', formData);
      showToast(res.message || 'Complaint submitted successfully!', 'success');

      // Close modal
      const modalEl = document.getElementById('modalNewComplaint');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // Reset form
      formSubmitComplaint.reset();
      imgPreview.src = '';
      imgPreviewContainer.classList.add('d-none');

      // Reload complaints
      loadComplaints();
    } catch (err) {
      showToast(err.message || 'Failed to submit complaint', 'error');
    } finally {
      btnSubmitModal.disabled = false;
      btnSubmitModal.querySelector('.btn-text').classList.remove('d-none');
      btnSubmitModal.querySelector('.spinner-border').classList.add('d-none');
    }
  });

  // Open Complaint Detail and Timeline Modal
  async function openComplaintDetailModal(id) {
    const modalEl = document.getElementById('modalComplaintDetail');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const modalBody = document.getElementById('complaintDetailBody');
    modalBody.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="small text-muted mt-2">Loading details...</div>
      </div>
    `;

    try {
      const res = await API.get(`/api/complaints/${id}`);
      const c = res.complaint;
      const timeline = res.timeline || [];

      // Stepper calculation
      const steps = ['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Verified'];
      const currentIndex = steps.indexOf(c.status);
      const progressPercent = Math.max(0, (currentIndex / (steps.length - 1)) * 100);

      const stepperHtml = `
        <div class="lifecycle-stepper">
          <div class="stepper-progress-bar" style="width: ${progressPercent}%;"></div>
          ${steps.map((st, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            const stateClass = isCompleted ? 'completed' : isActive ? 'active' : '';
            const iconHtml = isCompleted ? '<i class="bi bi-check-lg"></i>' : (idx + 1);
            return `
              <div class="stepper-step ${stateClass}">
                <div class="stepper-circle">${iconHtml}</div>
                <span class="stepper-label">${st}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Timeline events HTML
      const timelineEventsHtml = timeline.map(item => {
        const itemDate = new Date(item.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        return `
          <div class="timeline-item">
            <div class="timeline-bullet"><i class="bi bi-dot"></i></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="fw-bold small text-dark">${item.status}</span>
                <span class="text-muted" style="font-size: 0.72rem;">${itemDate}</span>
              </div>
              <div class="small text-secondary mb-1">${item.remarks || 'Status updated.'}</div>
              <div class="small text-muted" style="font-size: 0.72rem;">
                <i class="bi bi-person me-1"></i>Updated by ${item.user_name || 'System'} (${item.user_role || 'Staff'})
              </div>
              ${item.proof_image ? `
                <div class="mt-2">
                  <span class="small fw-semibold d-block text-success mb-1"><i class="bi bi-check-circle me-1"></i>Proof Photo:</span>
                  <a href="${item.proof_image}" target="_blank">
                    <img src="${item.proof_image}" class="img-thumbnail rounded" style="max-height: 120px;" alt="Proof">
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      modalBody.innerHTML = `
        <div class="border-bottom pb-3 mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="fw-bold mb-0">${c.title}</h5>
            <span class="badge bg-light text-primary border fw-bold">${c.complaint_code}</span>
          </div>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            ${getStatusBadge(c.status)}
            ${getPriorityBadge(c.priority)}
            <span class="badge bg-secondary-subtle text-dark"><i class="bi ${getCategoryIcon(c.category)} me-1"></i>${c.category}</span>
            <span class="text-muted small"><i class="bi bi-geo-alt text-danger me-1"></i>${c.location}</span>
          </div>
        </div>

        <!-- Visual Stepper Component -->
        ${stepperHtml}

        <div class="bg-light rounded-3 p-3 mb-4">
          <h6 class="fw-bold small text-uppercase text-muted mb-2">Issue Description</h6>
          <p class="small text-dark mb-2">${c.description}</p>
          <div class="row g-2 small text-muted">
            <div class="col-md-6">
              <i class="bi bi-person me-1"></i><strong>Reported by:</strong> ${c.submitter_name} (${c.submitter_dept || 'AJIET'})
            </div>
            <div class="col-md-6">
              <i class="bi bi-wrench me-1"></i><strong>Assigned Staff:</strong> ${c.assigned_staff_name ? `${c.assigned_staff_name} (${c.assigned_staff_phone || 'Staff'})` : '<span class="text-warning">Pending Assignment</span>'}
            </div>
          </div>
        </div>

        <!-- Issue Photo and Proof Photo Side by Side if available -->
        ${(c.image_url || c.proof_image) ? `
          <div class="row g-3 mb-4">
            ${c.image_url ? `
              <div class="col-sm-6">
                <div class="border rounded-3 p-2 bg-light text-center">
                  <span class="small fw-bold d-block mb-1 text-muted">Reported Issue Photo</span>
                  <a href="${c.image_url}" target="_blank">
                    <img src="${c.image_url}" class="img-fluid rounded" style="max-height: 160px; object-fit: cover;" alt="Reported Issue">
                  </a>
                </div>
              </div>
            ` : ''}
            ${c.proof_image ? `
              <div class="col-sm-6">
                <div class="border rounded-3 p-2 bg-success-subtle text-center">
                  <span class="small fw-bold d-block mb-1 text-success"><i class="bi bi-patch-check-fill me-1"></i>Resolution Proof Photo</span>
                  <a href="${c.proof_image}" target="_blank">
                    <img src="${c.proof_image}" class="img-fluid rounded" style="max-height: 160px; object-fit: cover;" alt="Proof of Resolution">
                  </a>
                  ${c.resolution_remarks ? `<div class="small text-dark mt-1 text-start"><em>"${c.resolution_remarks}"</em></div>` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Status History Timeline -->
        <h6 class="fw-bold small text-uppercase text-muted mb-3"><i class="bi bi-clock-history me-1"></i>Activity & Lifecycle Timeline</h6>
        <div class="timeline-list">
          ${timelineEventsHtml || '<p class="small text-muted">No timeline entries yet.</p>'}
        </div>
      `;
    } catch (err) {
      modalBody.innerHTML = `
        <div class="alert alert-danger mb-0">${err.message || 'Error loading details.'}</div>
      `;
    }
  }

  // Filter Event Listeners
  if (searchInput) searchInput.addEventListener('input', renderFilteredComplaints);
  if (statusFilter) statusFilter.addEventListener('change', renderFilteredComplaints);
  if (categoryFilter) categoryFilter.addEventListener('change', renderFilteredComplaints);
  if (btnRefresh) btnRefresh.addEventListener('click', loadComplaints);

  // Initial fetch
  loadComplaints();
});
