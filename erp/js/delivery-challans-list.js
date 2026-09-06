let allChallans = [];

document.addEventListener('erp:ready', () => {
  loadChallans();
  document.getElementById('challan-search').addEventListener('input', (e) => {
    renderChallans(filterChallans(e.target.value));
  });
});

async function loadChallans() {
  const { data, error } = await window.supabaseClient
    .from('delivery_challans')
    .select('*, customers(name, company_name)')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('challans-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="6">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allChallans = data;
  renderChallans(allChallans);
}

function filterChallans(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allChallans;
  return allChallans.filter((c) =>
    [c.challan_number, c.customers?.name, c.customers?.company_name, c.vehicle_no]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderChallans(rows) {
  const tbody = document.getElementById('challans-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="6">No delivery challans yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((c) => `
    <tr>
      <td>${escapeHtml(c.challan_number || '(draft)')}</td>
      <td>${escapeHtml(c.customers?.name || '—')}</td>
      <td>${escapeHtml(formatType(c.challan_type))}</td>
      <td>${escapeHtml(c.vehicle_no || '—')}</td>
      <td>${new Date(c.created_at).toLocaleDateString('en-IN')}</td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="delivery-challan-form.html?id=${c.id}">Open</a></td>
    </tr>
  `).join('');
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
