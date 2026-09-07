document.addEventListener('erp:ready', async () => {
  if (window.currentProfile.role !== 'admin') {
    document.getElementById('settings-body').style.display = 'none';
    document.getElementById('access-denied').style.display = '';
    return;
  }

  await loadCompanySettings();
  await loadUsers();
  await loadCounters();

  document.getElementById('save-company-btn').addEventListener('click', saveCompanySettings);
});

const DOC_TYPE_LABELS = {
  invoice: 'Invoice (INV)',
  quotation: 'Quotation (QTN)',
  repair_job: 'Repair Job Card (JOB)',
  delivery_challan: 'Delivery Challan (DC)',
  amc_agreement: 'AMC Agreement (AMC)',
  customer_receipt: 'Customer Receipt (RCPT)',
};

async function loadCounters() {
  const { data, error } = await window.supabaseClient
    .from('document_counters')
    .select('doc_type, year, last_number')
    .order('year', { ascending: false })
    .order('doc_type');

  const tbody = document.getElementById('counters-body');
  if (error) {
    tbody.innerHTML = `<tr class="erp-empty-row"><td colspan="5">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="5">No documents saved yet this year.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((c) => `
    <tr data-doc-type="${escapeHtml(c.doc_type)}" data-year="${c.year}">
      <td>${escapeHtml(DOC_TYPE_LABELS[c.doc_type] || c.doc_type)}</td>
      <td>${c.year}</td>
      <td><input type="number" class="f-last-number" value="${c.last_number}" min="0" step="1" style="width:90px;"></td>
      <td class="next-preview">${c.last_number + 1}</td>
      <td>
        <button class="btn btn-ghost save-counter-btn" style="padding:6px 10px; font-size:.8rem;">Save</button>
        <span class="counter-status" style="font-size:.8rem; margin-left:6px;"></span>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.f-last-number').forEach((input) => {
    input.addEventListener('input', () => {
      const tr = input.closest('tr');
      tr.querySelector('.next-preview').textContent = (parseInt(input.value) || 0) + 1;
    });
  });

  tbody.querySelectorAll('.save-counter-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const docType = tr.dataset.docType;
      const year = parseInt(tr.dataset.year);
      const lastNumber = parseInt(tr.querySelector('.f-last-number').value) || 0;
      const statusSpan = tr.querySelector('.counter-status');
      statusSpan.textContent = 'Saving…';
      statusSpan.style.color = '';

      const { error: updateError } = await window.supabaseClient
        .from('document_counters')
        .update({ last_number: lastNumber })
        .eq('doc_type', docType)
        .eq('year', year);

      if (updateError) {
        statusSpan.style.color = '#C0392B';
        statusSpan.textContent = updateError.message;
        return;
      }
      statusSpan.style.color = '#1B7F3A';
      statusSpan.textContent = 'Saved.';
    });
  });
}

async function loadCompanySettings() {
  const { data, error } = await window.supabaseClient
    .from('company_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    document.getElementById('company-save-status').textContent =
      'Could not load company settings — make sure the company_settings table exists (see settings-schema.sql).';
    return;
  }

  document.getElementById('cs-business-name').value = data.business_name || '';
  document.getElementById('cs-tagline').value = data.tagline || '';
  document.getElementById('cs-phone').value = data.phone || '';
  document.getElementById('cs-email').value = data.email || '';
  document.getElementById('cs-address').value = data.address || '';
  document.getElementById('cs-gstin').value = data.gstin || '';
  document.getElementById('cs-logo-url').value = data.logo_url || '';
  document.getElementById('cs-gst-percent').value = data.default_gst_percent ?? 18;
  document.getElementById('cs-tax-type').value = data.default_tax_type || 'cgst_sgst';
}

async function saveCompanySettings() {
  const statusEl = document.getElementById('company-save-status');
  statusEl.textContent = '';
  statusEl.style.color = '';

  const payload = {
    id: 1,
    business_name: document.getElementById('cs-business-name').value.trim(),
    tagline: document.getElementById('cs-tagline').value.trim() || null,
    phone: document.getElementById('cs-phone').value.trim() || null,
    email: document.getElementById('cs-email').value.trim() || null,
    address: document.getElementById('cs-address').value.trim() || null,
    gstin: document.getElementById('cs-gstin').value.trim() || null,
    logo_url: document.getElementById('cs-logo-url').value.trim() || 'logo.jpg',
    default_gst_percent: parseFloat(document.getElementById('cs-gst-percent').value) || 0,
    default_tax_type: document.getElementById('cs-tax-type').value,
    updated_at: new Date().toISOString(),
  };

  const { error } = await window.supabaseClient
    .from('company_settings')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    statusEl.textContent = error.message;
    return;
  }
  statusEl.style.color = '#1B7F3A';
  statusEl.textContent = 'Saved successfully.';
}

async function loadUsers() {
  const { data, error } = await window.supabaseClient
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name');

  const tbody = document.getElementById('users-body');
  if (error) {
    tbody.innerHTML = `<tr class="erp-empty-row"><td colspan="3">Could not load users: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="3">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((u) => `
    <tr data-id="${u.id}">
      <td>${escapeHtml(u.full_name || '(no name set)')}</td>
      <td>
        <select class="f-role" style="width:auto; padding:4px 8px;">
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
          <option value="technician" ${u.role === 'technician' ? 'selected' : ''}>Technician</option>
          <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
        </select>
      </td>
      <td>
        <button class="btn btn-ghost save-role-btn" style="padding:6px 10px; font-size:.8rem;">Save</button>
        <span class="role-status" style="font-size:.8rem; margin-left:6px;"></span>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.save-role-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const userId = tr.dataset.id;
      const newRole = tr.querySelector('.f-role').value;
      const statusSpan = tr.querySelector('.role-status');
      statusSpan.textContent = 'Saving…';
      statusSpan.style.color = '';

      const { error: updateError } = await window.supabaseClient
        .from('profiles').update({ role: newRole }).eq('id', userId);

      if (updateError) {
        statusSpan.style.color = '#C0392B';
        statusSpan.textContent = updateError.message;
        return;
      }
      statusSpan.style.color = '#1B7F3A';
      statusSpan.textContent = 'Saved.';
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
