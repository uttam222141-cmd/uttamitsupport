let allJobs = [];

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  waiting_parts: 'Waiting for Parts',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

document.addEventListener('erp:ready', () => {
  loadJobs();
  document.getElementById('job-search').addEventListener('input', (e) => {
    renderJobs(filterJobs(e.target.value));
  });
});

async function loadJobs() {
  const { data, error } = await window.supabaseClient
    .from('repair_jobs')
    .select('*, customers(name, company_name)')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('jobs-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="6">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allJobs = data;
  renderJobs(allJobs);
}

function filterJobs(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allJobs;
  return allJobs.filter((j) =>
    [j.job_number, j.customers?.name, j.brand, j.model, j.device_type].filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderJobs(rows) {
  const tbody = document.getElementById('jobs-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="6">No job cards yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((j) => `
    <tr>
      <td>${escapeHtml(j.job_number || '(draft)')}</td>
      <td>${escapeHtml(j.customers?.name || '—')}</td>
      <td>${escapeHtml([j.brand, j.model].filter(Boolean).join(' ') || j.device_type || '—')}</td>
      <td><span class="erp-badge role-${j.status === 'delivered' ? 'admin' : j.status === 'completed' ? 'technician' : 'viewer'}">${escapeHtml(STATUS_LABELS[j.status] || j.status)}</span></td>
      <td>${new Date(j.created_at).toLocaleDateString('en-IN')}</td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="job-card-form.html?id=${j.id}">Open</a></td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
