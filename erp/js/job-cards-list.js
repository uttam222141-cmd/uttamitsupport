let allJobs = [];

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
  return allJobs.filter((job) =>
    [job.job_number, job.customers?.name, job.customers?.company_name, job.device_type, job.brand, job.model]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderJobs(rows) {
  const tbody = document.getElementById('jobs-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="6">No job cards yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((job) => `
    <tr>
      <td>${escapeHtml(job.job_number || '(draft)')}</td>
      <td>${escapeHtml(job.customers?.name || '—')}</td>
      <td>${escapeHtml([job.device_type, job.brand, job.model].filter(Boolean).join(' '))}</td>
      <td><span class="erp-badge role-${job.status === 'delivered' || job.status === 'completed' ? 'admin' : 'viewer'}">${escapeHtml(formatStatus(job.status))}</span></td>
      <td>${new Date(job.created_at).toLocaleDateString('en-IN')}</td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="job-card-form.html?id=${job.id}">Open</a></td>
    </tr>
  `).join('');
}

function formatStatus(status) {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
