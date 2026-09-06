let allAmc = [];

document.addEventListener('erp:ready', () => {
  loadAmcAgreements();
  document.getElementById('amc-search').addEventListener('input', (e) => {
    renderAmc(filterAmc(e.target.value));
  });
});

async function loadAmcAgreements() {
  const { data, error } = await window.supabaseClient
    .from('amc_agreements')
    .select('*, customers(name, company_name)')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('amc-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="6">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allAmc = data;
  renderAmc(allAmc);
}

function filterAmc(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allAmc;
  return allAmc.filter((a) =>
    [a.agreement_number, a.customers?.name, a.customers?.company_name]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderAmc(rows) {
  const tbody = document.getElementById('amc-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="6">No AMC agreements yet.</td></tr>';
    return;
  }
  const today = new Date();
  tbody.innerHTML = rows.map((a) => {
    const endDate = a.end_date ? new Date(a.end_date) : null;
    const expired = endDate && endDate < today;
    return `
    <tr>
      <td>${escapeHtml(a.agreement_number || '(draft)')}</td>
      <td>${escapeHtml(a.customers?.name || '—')}</td>
      <td>${escapeHtml(formatType(a.agreement_type))}</td>
      <td>${a.end_date ? new Date(a.end_date).toLocaleDateString('en-IN') : '—'}</td>
      <td><span class="erp-badge role-${expired ? 'viewer' : 'admin'}">${expired ? 'Expired' : 'Active'}</span></td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="amc-agreement-form.html?id=${a.id}">Open</a></td>
    </tr>
  `;
  }).join('');
}

function formatType(type) {
  if (!type) return '—';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
