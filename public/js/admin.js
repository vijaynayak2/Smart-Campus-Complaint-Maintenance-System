/**
 * Admin Operations & Control Center Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth(['admin'])) return;
  Auth.setupNavbarUser();

  let allComplaints = [];
  let staffList = [];
  let allUsers = [];

  // Tab navigation
  const tabComplaints = document.getElementById('tabNavComplaints');
  const tabAnalytics = document.getElementById('tabNavAnalytics');
  const tabUsers = document.getElementById('tabNavUsers');

  const viewComplaints = document.getElementById('viewComplaints');
  const viewAnalytics = document.getElementById('viewAnalytics');
  const viewUsers = document.getElementById('viewUsers');

  function switchMainTab(tab) {
    [tabComplaints, tabAnalytics, tabUsers].forEach(t => t.classList.remove('active'));
    [viewComplaints, viewAnalytics, viewUsers].forEach(v => v.classList.add('d-none'));

    if (tab === 'analytics') {
      tabAnalytics.classList.add('active');
      viewAnalytics.classList.remove('d-none');
      CampusAnalytics.init();
    } else if (tab === 'users') {
      tabUsers.classList.add('active');
      viewUsers.classList.remove('d-none');
      loadUsers();
    } else {
      tabComplaints.classList.add('active');
      viewComplaints.classList.remove('d-none');
      loadComplaints();
    }
  }

  tabComplaints.addEventListener('click', () => switchMainTab('complaints'));
  tabAnalytics.addEventListener('click', () => switchMainTab('analytics'));
  tabUsers.addEventListener('click', () => switchMainTab('users'));

  // ========================================================
  // COMPLAINTS MANAGEMENT
  // ========================================================
  const searchInput = document.getElementById('adminSearch');
  const filterStatus = document.getElementById('adminFilterStatus');
  const filterCategory = document.getElementById('adminFilterCategory');
  const filterPriority = document.getElementById('adminFilterPriority');
  const filterStaff = document.getElementById('adminFilterStaff');
  const btnRefresh = document.getElementById('btnAdminRefresh');

  const complaintsTableBody = document.getElementById('adminComplaintsTableBody');
  const tableLoading = document.getElementById('adminTableLoading');
  const tableEmpty = document.getElementById('adminTableEmpty');

  // Load staff list for dropdowns
  async function loadStaffList() {
    try {
      const res = await API.get('/api/users/staff');
      staffList = res.staff || [];

      // Populate filter dropdown
      if (filterStaff) {
        filterStaff.innerHTML = '<option value="all">All Assigned Staff</option>';
        staffList.forEach(s => {
          filterStaff.innerHTML += `<option value="${s.id}">${s.name} (${s.department || 'Staff'})</option>`;
        });
      }

      // Populate assign modal dropdown
      const assignStaffSelect = document.getElementById('assignStaffSelect');
      if (assignStaffSelect) {
        assignStaffSelect.innerHTML = '<option value="" selected disabled>Select Technician / Staff</option>';
        staffList.forEach(s => {
          assignStaffSelect.innerHTML += `<option value="${s.id}">${s.name} - ${s.department || 'Maintenance'} (Active: ${s.active_tasks_count})</option>`;
        });
      }
    } catch (err) {
      console.warn('Failed to load staff list:', err);
    }
  }

  // Load all complaints
  async function loadComplaints() {
    tableLoading.classList.remove('d-none');
    tableEmpty.classList.add('d-none');
    complaintsTableBody.innerHTML = '';

    try {
      const res = await API.get('/api/complaints');
      allComplaints = res.complaints || [];

      updateAdminCounters(allComplaints);
      renderComplaintsTable();
    } catch (err) {
      showToast(err.message || 'Failed to load complaints', 'error');
    } finally {
      tableLoading.classList.add('d-none');
    }
  }

  function updateAdminCounters(list) {
    const total = list.length;
    const submitted = list.filter(c => c.status === 'Submitted').length;
    const assigned = list.filter(c => c.status === 'Assigned').length;
    const inProgress = list.filter(c => c.status === 'In Progress').length;
    const resolved = list.filter(c => c.status === 'Resolved').length;
    const verified = list.filter(c => c.status === 'Verified').length;

    const elTotal = document.getElementById('adminStatTotal');
    const elPending = document.getElementById('adminStatPending');
    const elInProgress = document.getElementById('adminStatInProgress');
    const elResolved = document.getElementById('adminStatResolved');

    if (elTotal) elTotal.textContent = total;
    if (elPending) elPending.textContent = submitted + assigned;
    if (elInProgress) elInProgress.textContent = inProgress;
    if (elResolved) elResolved.textContent = resolved + verified;
  }

  function renderComplaintsTable() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusVal = filterStatus ? filterStatus.value : 'all';
    const categoryVal = filterCategory ? filterCategory.value : 'all';
    const priorityVal = filterPriority ? filterPriority.value : 'all';
    const staffVal = filterStaff ? filterStaff.value : 'all';

    const filtered = allComplaints.filter(c => {
      const matchSearch = !searchTerm ||
        c.complaint_code.toLowerCase().includes(searchTerm) ||
        c.title.toLowerCase().includes(searchTerm) ||
        c.location.toLowerCase().includes(searchTerm) ||
        (c.submitter_name && c.submitter_name.toLowerCase().includes(searchTerm)) ||
        (c.assigned_staff_name && c.assigned_staff_name.toLowerCase().includes(searchTerm));

      const matchStatus = statusVal === 'all' || c.status === statusVal;
      const matchCategory = categoryVal === 'all' || c.category === categoryVal;
      const matchPriority = priorityVal === 'all' || c.priority === priorityVal;
      const matchStaff = staffVal === 'all' || String(c.assigned_to) === String(staffVal);

      return matchSearch && matchStatus && matchCategory && matchPriority && matchStaff;
    });

    if (filtered.length === 0) {
      complaintsTableBody.innerHTML = '';
      tableEmpty.classList.remove('d-none');
      return;
    }

    tableEmpty.classList.add('d-none');
    complaintsTableBody.innerHTML = filtered.map(c => {
      const formattedDate = new Date(c.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const isResolvedAwaitingVerify = c.status === 'Resolved';

      return `
        <tr>
          <td>
            <span class="badge bg-light text-primary border fw-bold">${c.complaint_code}</span>
            <div class="text-muted" style="font-size: 0.72rem;">${formattedDate}</div>
          </td>
          <td>
            <div class="fw-bold text-dark text-truncate" style="max-width: 220px;" title="${c.title}">${c.title}</div>
            <small class="text-muted d-block">${c.category}</small>
          </td>
          <td>
            <div class="small text-truncate" style="max-width: 180px;" title="${c.location}">
              <i class="bi bi-geo-alt text-danger me-1"></i>${c.location}
            </div>
            <div class="text-muted" style="font-size: 0.72rem;">By: ${c.submitter_name || 'User'}</div>
          </td>
          <td>
            <select class="form-select form-select-sm inline-priority-select fw-semibold" data-id="${c.id}" style="width: 105px; font-size: 0.78rem;">
              <option value="Low" ${c.priority === 'Low' ? 'selected' : ''}>Low</option>
              <option value="Medium" ${c.priority === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="High" ${c.priority === 'High' ? 'selected' : ''}>High</option>
              <option value="Critical" ${c.priority === 'Critical' ? 'selected' : ''}>Critical</option>
            </select>
          </td>
          <td>
            ${c.assigned_staff_name ? `
              <div class="small fw-semibold text-dark text-truncate" style="max-width: 150px;">
                <i class="bi bi-person-check text-success me-1"></i>${c.assigned_staff_name}
              </div>
              <button class="btn btn-link btn-sm p-0 text-primary text-decoration-none btn-open-assign" data-id="${c.id}" data-current="${c.assigned_to || ''}" style="font-size: 0.72rem;">
                Reassign
              </button>
            ` : `
              <button class="btn btn-sm btn-outline-warning text-dark fw-bold btn-open-assign" data-id="${c.id}" style="font-size: 0.75rem;">
                <i class="bi bi-person-plus me-1"></i>Assign Staff
              </button>
            `}
          </td>
          <td>
            ${getStatusBadge(c.status)}
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              ${isResolvedAwaitingVerify ? `
                <button class="btn btn-success fw-bold btn-verify" data-id="${c.id}" data-code="${c.complaint_code}" title="Verify Resolution">
                  <i class="bi bi-patch-check-fill me-1"></i>Verify
                </button>
              ` : ''}
              <button class="btn btn-outline-secondary btn-view-admin-detail" data-id="${c.id}" title="View Details & Timeline">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-danger btn-delete-complaint" data-id="${c.id}" data-code="${c.complaint_code}" title="Delete Complaint">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Event Handlers
    attachTableEventHandlers();
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

  function attachTableEventHandlers() {
    // Priority inline change
    complaintsTableBody.querySelectorAll('.inline-priority-select').forEach(select => {
      select.addEventListener('change', async function() {
        const id = this.getAttribute('data-id');
        const priority = this.value;
        try {
          await API.post(`/api/complaints/${id}/priority`, { priority });
          showToast(`Priority updated to ${priority}`, 'success');
          loadComplaints();
        } catch (err) {
          showToast(err.message || 'Failed to update priority', 'error');
        }
      });
    });

    // Assign modal opener
    complaintsTableBody.querySelectorAll('.btn-open-assign').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const currentStaffId = this.getAttribute('data-current') || '';
        openAssignModal(id, currentStaffId);
      });
    });

    // Verify Resolution
    complaintsTableBody.querySelectorAll('.btn-verify').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const code = this.getAttribute('data-code');
        openVerifyModal(id, code);
      });
    });

    // View Details
    complaintsTableBody.querySelectorAll('.btn-view-admin-detail').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        openAdminDetailModal(id);
      });
    });

    // Delete
    complaintsTableBody.querySelectorAll('.btn-delete-complaint').forEach(btn => {
      btn.addEventListener('click', async function() {
        const id = this.getAttribute('data-id');
        const code = this.getAttribute('data-code');
        if (confirm(`Are you sure you want to permanently delete complaint #${code}? This action cannot be undone.`)) {
          try {
            await API.delete(`/api/complaints/${id}`);
            showToast(`Complaint #${code} deleted`, 'info');
            loadComplaints();
          } catch (err) {
            showToast(err.message || 'Failed to delete complaint', 'error');
          }
        }
      });
    });
  }

  // ========================================================
  // ASSIGN STAFF MODAL
  // ========================================================
  let currentAssignComplaintId = null;
  const modalAssignEl = document.getElementById('modalAssignStaff');
  const modalAssign = new bootstrap.Modal(modalAssignEl);
  const formAssignStaff = document.getElementById('formAssignStaff');
  const assignStaffSelect = document.getElementById('assignStaffSelect');
  const assignPrioritySelect = document.getElementById('assignPrioritySelect');
  const assignRemarksInput = document.getElementById('assignRemarks');
  const btnSubmitAssign = document.getElementById('btnSubmitAssign');

  function openAssignModal(complaintId, currentStaffId) {
    currentAssignComplaintId = complaintId;
    const c = allComplaints.find(item => String(item.id) === String(complaintId));
    if (c) {
      document.getElementById('assignModalCode').textContent = c.complaint_code;
      document.getElementById('assignModalTitle').textContent = c.title;
      assignPrioritySelect.value = c.priority;
    }
    assignStaffSelect.value = currentStaffId || '';
    assignRemarksInput.value = '';
    modalAssign.show();
  }

  formAssignStaff.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentAssignComplaintId) return;

    const staff_id = assignStaffSelect.value;
    const priority = assignPrioritySelect.value;
    const remarks = assignRemarksInput.value.trim();

    if (!staff_id) {
      showToast('Please select a technician to assign.', 'warning');
      return;
    }

    btnSubmitAssign.disabled = true;
    try {
      const res = await API.post(`/api/complaints/${currentAssignComplaintId}/assign`, {
        staff_id,
        priority,
        remarks
      });

      showToast(res.message || 'Staff assigned successfully!', 'success');
      modalAssign.hide();
      loadComplaints();
      loadStaffList();
    } catch (err) {
      showToast(err.message || 'Failed to assign staff', 'error');
    } finally {
      btnSubmitAssign.disabled = false;
    }
  });

  // ========================================================
  // VERIFY RESOLUTION MODAL
  // ========================================================
  let currentVerifyComplaintId = null;
  const modalVerifyEl = document.getElementById('modalVerifyComplaint');
  const modalVerify = new bootstrap.Modal(modalVerifyEl);
  const formVerify = document.getElementById('formVerifyComplaint');
  const verifyRemarksInput = document.getElementById('verifyRemarks');
  const btnSubmitVerify = document.getElementById('btnSubmitVerify');

  function openVerifyModal(complaintId, code) {
    currentVerifyComplaintId = complaintId;
    document.getElementById('verifyModalCode').textContent = code;
    const c = allComplaints.find(item => String(item.id) === String(complaintId));
    if (c) {
      document.getElementById('verifyStaffName').textContent = c.assigned_staff_name || 'Staff';
      document.getElementById('verifyStaffRemarks').textContent = c.resolution_remarks || 'Work reported completed.';
      const proofBox = document.getElementById('verifyProofPreviewBox');
      if (c.proof_image) {
        proofBox.innerHTML = `
          <a href="${c.proof_image}" target="_blank">
            <img src="${c.proof_image}" class="img-fluid rounded border border-success" style="max-height: 180px;" alt="Resolution proof">
          </a>
        `;
        proofBox.classList.remove('d-none');
      } else {
        proofBox.classList.add('d-none');
      }
    }
    verifyRemarksInput.value = 'Inspected on-site by Estate Office. Repair meets AJIET campus safety and quality standards.';
    modalVerify.show();
  }

  formVerify.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentVerifyComplaintId) return;

    const remarks = verifyRemarksInput.value.trim();

    btnSubmitVerify.disabled = true;
    try {
      const res = await API.post(`/api/complaints/${currentVerifyComplaintId}/status`, {
        status: 'Verified',
        remarks
      });

      showToast(res.message || 'Complaint verified and closed!', 'success');
      modalVerify.hide();
      loadComplaints();
    } catch (err) {
      showToast(err.message || 'Failed to verify complaint', 'error');
    } finally {
      btnSubmitVerify.disabled = false;
    }
  });

  // ========================================================
  // VIEW FULL DETAILS & TIMELINE MODAL
  // ========================================================
  async function openAdminDetailModal(id) {
    const modalEl = document.getElementById('modalAdminDetail');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const bodyEl = document.getElementById('adminDetailModalBody');
    bodyEl.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>`;

    try {
      const res = await API.get(`/api/complaints/${id}`);
      const c = res.complaint;
      const timeline = res.timeline || [];

      bodyEl.innerHTML = `
        <div class="border-bottom pb-3 mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <h5 class="fw-bold mb-0">${c.title}</h5>
            <span class="badge bg-light text-primary border">${c.complaint_code}</span>
          </div>
          <div class="small text-muted mb-2"><i class="bi bi-geo-alt text-danger me-1"></i>${c.location}</div>
          <div class="d-flex flex-wrap gap-2">
            ${getStatusBadge(c.status)}
            <span class="badge bg-secondary-subtle text-dark">${c.category}</span>
            <span class="badge bg-warning-subtle text-dark">Priority: ${c.priority}</span>
          </div>
        </div>

        <div class="bg-light rounded-3 p-3 mb-3 small">
          <div class="row g-2">
            <div class="col-md-6">
              <strong>Submitter:</strong> ${c.submitter_name} (${c.submitter_dept || 'AJIET'})<br>
              <strong>Email:</strong> ${c.submitter_email}<br>
              <strong>Phone:</strong> ${c.submitter_phone || 'N/A'}
            </div>
            <div class="col-md-6">
              <strong>Assigned Staff:</strong> ${c.assigned_staff_name ? `${c.assigned_staff_name} (${c.assigned_staff_phone || 'No phone'})` : '<span class="text-danger">Unassigned</span>'}<br>
              <strong>Verified By:</strong> ${c.verified_by_name || 'Pending verification'}
            </div>
          </div>
          <hr class="my-2">
          <strong>Description:</strong>
          <p class="text-secondary mb-0">${c.description}</p>
        </div>

        <!-- Before / After Photos -->
        <div class="row g-3 mb-4">
          <div class="col-6">
            <div class="border rounded-3 p-2 bg-light text-center">
              <span class="small fw-bold d-block mb-1 text-muted">Original Issue Photo</span>
              ${c.image_url ? `
                <a href="${c.image_url}" target="_blank">
                  <img src="${c.image_url}" class="img-fluid rounded" style="max-height: 140px; object-fit: cover;" alt="Reported issue">
                </a>
              ` : '<div class="py-4 text-muted small">No photo uploaded</div>'}
            </div>
          </div>
          <div class="col-6">
            <div class="border rounded-3 p-2 bg-success-subtle text-center">
              <span class="small fw-bold d-block mb-1 text-success">Resolution Proof Photo</span>
              ${c.proof_image ? `
                <a href="${c.proof_image}" target="_blank">
                  <img src="${c.proof_image}" class="img-fluid rounded" style="max-height: 140px; object-fit: cover;" alt="Proof photo">
                </a>
                <div class="small text-start text-dark mt-1"><em>${c.resolution_remarks || ''}</em></div>
              ` : '<div class="py-4 text-muted small">No proof photo yet</div>'}
            </div>
          </div>
        </div>

        <h6 class="fw-bold small text-uppercase text-muted mb-2">Audit Log & Timeline</h6>
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

  // ========================================================
  // USER MANAGEMENT TAB
  // ========================================================
  const usersTableBody = document.getElementById('adminUsersTableBody');
  const userSearch = document.getElementById('userSearchInput');
  const userFilterRole = document.getElementById('userFilterRole');
  const btnNewUserModal = document.getElementById('btnOpenNewUserModal');
  const modalNewUser = new bootstrap.Modal(document.getElementById('modalCreateUser'));
  const formCreateUser = document.getElementById('formCreateUser');

  async function loadUsers() {
    try {
      const res = await API.get('/api/users');
      allUsers = res.users || [];
      renderUsersTable();
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    }
  }

  function renderUsersTable() {
    const searchTerm = userSearch ? userSearch.value.toLowerCase().trim() : '';
    const roleVal = userFilterRole ? userFilterRole.value : 'all';

    const filtered = allUsers.filter(u => {
      const matchSearch = !searchTerm ||
        u.name.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm) ||
        (u.department && u.department.toLowerCase().includes(searchTerm));

      const matchRole = roleVal === 'all' || u.role === roleVal;
      return matchSearch && matchRole;
    });

    usersTableBody.innerHTML = filtered.map(u => {
      let roleBadge = 'bg-secondary';
      if (u.role === 'admin') roleBadge = 'bg-danger';
      else if (u.role === 'staff') roleBadge = 'bg-warning text-dark';
      else if (u.role === 'student') roleBadge = 'bg-primary';

      return `
        <tr>
          <td>
            <div class="fw-bold text-dark">${u.name}</div>
            <div class="text-muted small">${u.user_type || 'User'}</div>
          </td>
          <td>${u.email}</td>
          <td><span class="badge ${roleBadge} fw-bold text-uppercase">${u.role}</span></td>
          <td>${u.department || '<span class="text-muted">General</span>'}</td>
          <td>${u.phone || '<span class="text-muted">-</span>'}</td>
          <td>
            <span class="badge bg-light text-dark border">Filed: ${u.filed_count || 0}</span>
            ${u.role === 'staff' ? `<span class="badge bg-warning-subtle text-dark border ms-1">Assigned: ${u.assigned_count || 0}</span>` : ''}
          </td>
          <td class="text-end">
            <button class="btn btn-outline-secondary btn-sm btn-edit-user-role" data-id="${u.id}" data-role="${u.role}" data-name="${u.name}">
              <i class="bi bi-pencil me-1"></i>Role
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach role change modal
    usersTableBody.querySelectorAll('.btn-edit-user-role').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const role = this.getAttribute('data-role');
        const name = this.getAttribute('data-name');
        openEditUserModal(id, name, role);
      });
    });
  }

  // Create User
  btnNewUserModal.addEventListener('click', () => {
    formCreateUser.reset();
    modalNewUser.show();
  });

  formCreateUser.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const department = document.getElementById('newUserDept').value.trim();
    const phone = document.getElementById('newUserPhone').value.trim();

    try {
      const res = await API.post('/api/users', {
        name, email, password, role, department, phone
      });
      showToast(res.message || 'User created successfully', 'success');
      modalNewUser.hide();
      loadUsers();
      loadStaffList();
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  });

  // Edit User Modal
  const modalEditUser = new bootstrap.Modal(document.getElementById('modalEditUserRole'));
  const formEditUser = document.getElementById('formEditUserRole');
  let currentEditUserId = null;

  function openEditUserModal(id, name, role) {
    currentEditUserId = id;
    document.getElementById('editUserNameTitle').textContent = name;
    document.getElementById('editUserRoleSelect').value = role;
    modalEditUser.show();
  }

  formEditUser.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditUserId) return;

    const role = document.getElementById('editUserRoleSelect').value;
    try {
      const res = await API.put(`/api/users/${currentEditUserId}`, { role });
      showToast(res.message || 'User role updated', 'success');
      modalEditUser.hide();
      loadUsers();
      loadStaffList();
    } catch (err) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  });

  // Filter Listeners
  if (searchInput) searchInput.addEventListener('input', renderComplaintsTable);
  if (filterStatus) filterStatus.addEventListener('change', renderComplaintsTable);
  if (filterCategory) filterCategory.addEventListener('change', renderComplaintsTable);
  if (filterPriority) filterPriority.addEventListener('change', renderComplaintsTable);
  if (filterStaff) filterStaff.addEventListener('change', renderComplaintsTable);
  if (btnRefresh) btnRefresh.addEventListener('click', loadComplaints);

  if (userSearch) userSearch.addEventListener('input', renderUsersTable);
  if (userFilterRole) userFilterRole.addEventListener('change', renderUsersTable);

  // Initial load
  loadStaffList();
  loadComplaints();
});
