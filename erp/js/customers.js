let allCustomers = [];

document.addEventListener('erp:ready', () => {
  loadCustomers();

  document.getElementById('open-add-customer')?.addEventListener('click', () => openModal());
  document.getElementById('close-customer-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-customer-form').addEventListener('click', closeModal);
  document.getElementById('customer-modal').addEventListener('click', (e) => {
    if (e.target.id === 'customer-modal') closeModal();
  });
  document.getElementById('customer-form').addEventListener('submit', saveCustomer);
  document.getElementById('customer-search').addEventListener('input', (e) => {
    renderCustomers(filterCustomers(e.target.value));
  });
});

async function loadCustomers() {
  const { data, error } = await window.supabaseClient
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('customers-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="7">Could not load customers: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allCustomers = data;
  renderCustomers(allCustomers);
}

function filterCustomers(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allCustomers;
  return allCustomers.filter((c) =>
    [c.name, c.phone, c.city, c.company_name, c.email].filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderCustomers(rows) {
  const tbody = document.getElementById('customers-body');
  const canEdit = ['admin', 'technician'].includes(window.currentProfile?.role);

  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="7">No customers found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((c) => `
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.company_name || '—')}</td>
      <td><a href="tel:${escapeHtml(c.phone)}">${escapeHtml(c.phone)}</a></td>
      <td>${c.email ? `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>` : '—'}</td>
      <td>${escapeHtml(c.city || '—')}</td>
      <td>${new Date(c.created_at).toLocaleDateString('en-IN')}</td>
      <td>
        ${canEdit ? `
          <button class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" onclick="editCustomer('${c.id}')">Edit</button>
          ${window.currentProfile.role === 'admin' ? `<button class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem; color:#B3401D; border-color:#F0C9BC;" onclick="deleteCustomer('${c.id}')">Delete</button>` : ''}
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function openModal(customer) {
  document.getElementById('customer-form-error').textContent = '';
  document.getElementById('customer-modal-title').textContent = customer ? 'Edit Customer' : 'New Customer';
  document.getElementById('customer-id').value = customer?.id || '';
  document.getElementById('c-name').value = customer?.name || '';
  document.getElementById('c-company').value = customer?.company_name || '';
  document.getElementById('c-phone').value = customer?.phone || '';
  document.getElementById('c-email').value = customer?.email || '';
  document.getElementById('c-gst').value = customer?.gst || '';
  document.getElementById('c-city').value = customer?.city || '';
  document.getElementById('c-state').value = customer?.state || '';
  document.getElementById('c-address').value = customer?.address || '';
  document.getElementById('c-notes').value = customer?.notes || '';
  document.getElementById('customer-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('customer-modal').classList.remove('open');
}

function editCustomer(id) {
  const c = allCustomers.find((x) => x.id === id);
  if (c) openModal(c);
}

async function saveCustomer(e) {
  e.preventDefault();
  const errorEl = document.getElementById('customer-form-error');
  errorEl.textContent = '';

  const id = document.getElementById('customer-id').value;
  const payload = {
    name: document.getElementById('c-name').value.trim(),
    company_name: document.getElementById('c-company').value.trim() || null,
    phone: document.getElementById('c-phone').value.trim(),
    email: document.getElementById('c-email').value.trim() || null,
    gst: document.getElementById('c-gst').value.trim() || null,
    city: document.getElementById('c-city').value.trim() || null,
    state: document.getElementById('c-state').value.trim() || null,
    address: document.getElementById('c-address').value.trim() || null,
    notes: document.getElementById('c-notes').value.trim() || null,
  };

  let result;
  if (id) {
    result = await window.supabaseClient.from('customers').update(payload).eq('id', id).select().single();
  } else {
    payload.created_by = window.currentUser.id;
    result = await window.supabaseClient.from('customers').insert(payload).select().single();
  }

  if (result.error) {
    errorEl.textContent = result.error.message;
    return;
  }

  await window.supabaseClient.from('activity_logs').insert({
    entity_type: 'customer',
    entity_id: result.data.id,
    action: id ? 'updated' : 'created',
    performed_by: window.currentUser.id,
  });

  closeModal();
  loadCustomers();
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer? This cannot be undone.')) return;
  const { error } = await window.supabaseClient.from('customers').delete().eq('id', id);
  if (error) {
    alert('Could not delete: ' + error.message);
    return;
  }
  loadCustomers();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
