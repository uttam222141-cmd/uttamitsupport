let allInvoices = [];

document.addEventListener('erp:ready', () => {
  loadInvoices();
  document.getElementById('invoice-search').addEventListener('input', (e) => {
    renderInvoices(filterInvoices(e.target.value));
  });
});

async function loadInvoices() {
  const { data, error } = await window.supabaseClient
    .from('invoices')
    .select('*, customers(name, company_name)')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('invoices-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="6">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allInvoices = data;
  renderInvoices(allInvoices);
}

function filterInvoices(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allInvoices;
  return allInvoices.filter((inv) =>
    [inv.invoice_number, inv.customers?.name, inv.customers?.company_name].filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderInvoices(rows) {
  const tbody = document.getElementById('invoices-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="6">No invoices yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((inv) => `
    <tr>
      <td>${escapeHtml(inv.invoice_number || '(draft)')}</td>
      <td>${escapeHtml(inv.customers?.name || '—')}</td>
      <td>${new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
      <td><span class="erp-badge role-${inv.payment_status === 'paid' ? 'admin' : 'viewer'}">${escapeHtml(inv.payment_status)}</span></td>
      <td>₹${Number(inv.total || 0).toLocaleString('en-IN')}</td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="invoice-form.html?id=${inv.id}">Open</a></td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
