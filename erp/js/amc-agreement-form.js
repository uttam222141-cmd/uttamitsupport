let customersCache = [];
let amcId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('erp:ready', async () => {
  document.getElementById('meta-date').textContent = new Date().toLocaleDateString('en-IN');

  await loadCustomers();

  if (amcId) {
    document.getElementById('form-title').textContent = 'Edit AMC Agreement';
    await loadAmc(amcId);
  } else {
    addRow();
  }

  document.getElementById('customer-input').addEventListener('input', onCustomerPick);
  document.getElementById('add-row-btn').addEventListener('click', () => addRow());
  document.getElementById('save-btn').addEventListener('click', saveAmc);
  document.getElementById('print-btn').addEventListener('click', () => window.print());
});

async function loadCustomers() {
  const { data, error } = await window.supabaseClient
    .from('customers')
    .select('id, name, phone, company_name, email, address')
    .order('name');
  if (error) return;
  customersCache = data;
  const datalist = document.getElementById('customer-options');
  datalist.innerHTML = data.map((c) => `<option value="${escapeHtml(c.name)} — ${escapeHtml(c.phone)}">`).join('');
}

function onCustomerPick(e) {
  const val = e.target.value;
  const match = customersCache.find((c) => `${c.name} — ${c.phone}` === val);
  if (!match) return;
  document.getElementById('customer-id').value = match.id;
  fillCustomerBox(match);
}

function fillCustomerBox(c) {
  document.getElementById('p-name').textContent = c.name || '—';
  document.getElementById('p-company').textContent = c.company_name || '—';
  document.getElementById('p-phone').textContent = c.phone || '—';
  document.getElementById('p-email').textContent = c.email || '—';
  document.getElementById('p-address').textContent = c.address || '—';
}

function addRow(item) {
  const tbody = document.getElementById('items-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="num">${tbody.children.length + 1}</td>
    <td><input type="text" class="f-device" value="${escapeAttr(item?.device_type)}"></td>
    <td><input type="text" class="f-brand" value="${escapeAttr(item?.brand)}"></td>
    <td><input type="text" class="f-model" value="${escapeAttr(item?.model)}"></td>
    <td><input type="text" class="f-serial" value="${escapeAttr(item?.serial_no)}"></td>
    <td><input type="number" class="f-qty" value="${item?.qty ?? 1}" min="0" step="1"></td>
    <td><button type="button" class="row-remove">&times;</button></td>
  `;
  tbody.appendChild(tr);

  tr.querySelector('.row-remove').addEventListener('click', () => {
    tr.remove();
    renumberRows();
  });
}

function renumberRows() {
  document.querySelectorAll('#items-body tr').forEach((tr, i) => {
    tr.querySelector('td.num').textContent = i + 1;
  });
}

async function loadAmc(id) {
  const { data: amc, error } = await window.supabaseClient
    .from('amc_agreements')
    .select('*, customers(*)')
    .eq('id', id)
    .single();
  if (error || !amc) {
    document.getElementById('save-status').textContent = 'Could not load this agreement.';
    return;
  }

  document.getElementById('meta-number').textContent = amc.agreement_number || '(auto on save)';
  document.getElementById('meta-date').textContent = new Date(amc.created_at).toLocaleDateString('en-IN');
  document.getElementById('start-date').value = amc.start_date || '';
  document.getElementById('end-date').value = amc.end_date || '';
  document.getElementById('visits-count').value = amc.visits_count ?? 4;
  document.getElementById('contract-value').value = amc.contract_value ?? 0;
  document.getElementById('terms-conditions').value = amc.terms_conditions || '';
  document.getElementById('remarks').value = amc.remarks || '';
  const typeInput = document.querySelector(`input[name="agreement-type"][value="${amc.agreement_type}"]`);
  if (typeInput) typeInput.checked = true;

  if (amc.customers) {
    document.getElementById('customer-id').value = amc.customer_id;
    document.getElementById('customer-input').value = `${amc.customers.name} — ${amc.customers.phone}`;
    fillCustomerBox(amc.customers);
  }

  const { data: items } = await window.supabaseClient
    .from('amc_agreement_items')
    .select('*')
    .eq('amc_agreement_id', id)
    .order('sr_no');

  document.getElementById('items-body').innerHTML = '';
  (items && items.length ? items : [{}]).forEach((it) => addRow(it));
}

async function saveAmc() {
  const statusEl = document.getElementById('save-status');
  statusEl.textContent = '';
  statusEl.style.color = '';

  const customerId = document.getElementById('customer-id').value;
  if (!customerId) {
    statusEl.textContent = 'Please select a customer first.';
    return;
  }

  const payload = {
    customer_id: customerId,
    agreement_type: document.querySelector('input[name="agreement-type"]:checked').value,
    start_date: document.getElementById('start-date').value || null,
    end_date: document.getElementById('end-date').value || null,
    visits_count: parseInt(document.getElementById('visits-count').value) || 0,
    contract_value: parseFloat(document.getElementById('contract-value').value) || 0,
    terms_conditions: document.getElementById('terms-conditions').value.trim() || null,
    remarks: document.getElementById('remarks').value.trim() || null,
  };

  const items = Array.from(document.querySelectorAll('#items-body tr')).map((tr, i) => ({
    sr_no: i + 1,
    device_type: tr.querySelector('.f-device').value.trim(),
    brand: tr.querySelector('.f-brand').value.trim() || null,
    model: tr.querySelector('.f-model').value.trim() || null,
    serial_no: tr.querySelector('.f-serial').value.trim() || null,
    qty: parseFloat(tr.querySelector('.f-qty').value) || 0,
  })).filter((it) => it.device_type);

  if (!items.length) {
    statusEl.textContent = 'Add at least one device with a device type.';
    return;
  }

  let id = amcId;

  if (!id) {
    const { data: numberData, error: numError } = await window.supabaseClient
      .rpc('next_document_number', { p_doc_type: 'amc_agreement', p_prefix: 'AMC' });
    if (numError) {
      statusEl.textContent = 'Could not generate agreement number: ' + numError.message;
      return;
    }
    payload.agreement_number = numberData;
    payload.created_by = window.currentUser.id;

    const { data: inserted, error: insertError } = await window.supabaseClient
      .from('amc_agreements').insert(payload).select().single();
    if (insertError) {
      statusEl.textContent = insertError.message;
      return;
    }
    id = inserted.id;
    amcId = id;
    window.history.replaceState({}, '', `amc-agreement-form.html?id=${id}`);
    document.getElementById('meta-number').textContent = inserted.agreement_number;
    document.getElementById('form-title').textContent = 'Edit AMC Agreement';
  } else {
    const { error: updateError } = await window.supabaseClient
      .from('amc_agreements').update(payload).eq('id', id);
    if (updateError) {
      statusEl.textContent = updateError.message;
      return;
    }
  }

  await window.supabaseClient.from('amc_agreement_items').delete().eq('amc_agreement_id', id);
  const itemsToInsert = items.map((it) => ({ ...it, amc_agreement_id: id }));
  const { error: itemsError } = await window.supabaseClient.from('amc_agreement_items').insert(itemsToInsert);
  if (itemsError) {
    statusEl.textContent = 'Saved, but devices failed: ' + itemsError.message;
    return;
  }

  statusEl.style.color = '#1B7F3A';
  statusEl.textContent = 'Saved successfully.';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
