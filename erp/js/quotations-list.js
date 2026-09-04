let allQuotes = [];

document.addEventListener('erp:ready', () => {
  loadQuotes();
  document.getElementById('quote-search').addEventListener('input', (e) => {
    renderQuotes(filterQuotes(e.target.value));
  });
});

async function loadQuotes() {
  const { data, error } = await window.supabaseClient
    .from('quotations')
    .select('*, customers(name, company_name)')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('quotes-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="6">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allQuotes = data;
  renderQuotes(allQuotes);
}

function filterQuotes(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allQuotes;
  return allQuotes.filter((quo) =>
    [quo.quotation_number, quo.customers?.name, quo.customers?.company_name].filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderQuotes(rows) {
  const tbody = document.getElementById('quotes-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="6">No quotations yet.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((quo) => `
    <tr>
      <td>${escapeHtml(quo.quotation_number || '(draft)')}</td>
      <td>${escapeHtml(quo.customers?.name || '—')}</td>
      <td>${new Date(quo.created_at).toLocaleDateString('en-IN')}</td>
      <td><span class="erp-badge role-${quo.status === 'converted' ? 'admin' : 'viewer'}">${escapeHtml(quo.status)}</span></td>
      <td>₹${Number(quo.total || 0).toLocaleString('en-IN')}</td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="quotation-form.html?id=${quo.id}">Open</a></td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
