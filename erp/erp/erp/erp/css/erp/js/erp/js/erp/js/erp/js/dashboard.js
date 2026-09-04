document.addEventListener('erp:ready', async () => {
  const db = window.supabaseClient;

  const [customers, quotations, paidInvoices, pendingRepairs, activeAmc, recent] = await Promise.all([
    db.from('customers').select('id', { count: 'exact', head: true }),
    db.from('quotations').select('id', { count: 'exact', head: true }),
    db.from('invoices').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
    db.from('repair_jobs').select('id', { count: 'exact', head: true }).neq('status', 'delivered'),
    db.from('amc_agreements').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('customers').select('name, phone, city, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  setStat('stat-customers', customers.count);
  setStat('stat-quotations', quotations.count);
  setStat('stat-paid-invoices', paidInvoices.count);
  setStat('stat-pending-repairs', pendingRepairs.count);
  setStat('stat-active-amc', activeAmc.count);

  const tbody = document.getElementById('recent-customers-body');
  const rows = recent.data || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="4">No customers yet — add your first one.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((c) => `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.city || '—')}</td>
      <td>${new Date(c.created_at).toLocaleDateString('en-IN')}</td>
    </tr>
  `).join('');
});

function setStat(id, value) {
  document.getElementById(id).textContent = (value ?? 0).toLocaleString('en-IN');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
