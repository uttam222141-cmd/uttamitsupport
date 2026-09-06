let allReceipts = [];

document.addEventListener('erp:ready', () => {
  loadReceipts();
  document.getElementById('receipt-search').addEventListener('input', (e) => {
    renderReceipts(filterReceipts(e.target.value));
  });
});

async function loadReceipts() {
  const { data, error } = await window.supabaseClient
    .from('customer_receipts')
    .select('*, customers(name, company_name)')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('receipts-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="6">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allReceipts = data;
  renderReceipts(allReceipts);
}

function filterReceipts(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allReceipts;
  return allReceipts.filter((r) =>
    [r.receipt_number, r.customers?.name, r.customers?.company_name]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderReceipts(rows) {
  const tbody = document.getElementById('receipts-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="6">No receipts yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r) => `
    <tr>
      <td>${escapeHtml(r.receipt_number || '(draft)')}</td>
      <td>${escapeHtml(r.customers?.name || '—')}</td>
      <td>${escapeHtml(formatMode(r.payment_mode))}</td>
      <td>₹${Number(r.amount || 0).toLocaleString('en-IN')}</td>
      <td>${new Date(r.created_at).toLocaleDateString('en-IN')}</td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="receipt-form.html?id=${r.id}">Open</a></td>
    </tr>
  `).join('');
}

function formatMode(mode) {
  if (!mode) return '—';
  return mode.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
