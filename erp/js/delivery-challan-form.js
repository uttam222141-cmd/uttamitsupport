let customersCache = [];
let challanId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('erp:ready', async () => {
  document.getElementById('meta-date').textContent = new Date().toLocaleDateString('en-IN');

  await loadCustomers();

  if (challanId) {
    document.getElementById('form-title').textContent = 'Edit Delivery Challan';
    await loadChallan(challanId);
  } else {
    addRow();
  }

  document.getElementById('customer-input').addEventListener('input', onCustomerPick);
  document.getElementById('add-row-btn').addEventListener('click', () => addRow());
  document.getElementById('save-btn').addEventListener('click', saveChallan);
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
    <td><input type="text" class="f-desc" value="${escapeAttr(item?.description)}"></td>
    <td><input type="text" class="f-hsn" value="${escapeAttr(item?.hsn_sac)}"></td>
    <td><input type="number" class="f-qty" value="${item?.qty ?? 1}" min="0" step="1"></td>
    <td><input type="text" class="f-unit" value="${escapeAttr(item?.unit)}" placeholder="pcs"></td>
    <td><input type="text" class="f-remarks" value="${escapeAttr(item?.remarks)}"></td>
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

async function loadChallan(id) {
  const { data: challan, error } = await window.supabaseClient
    .from('delivery_challans')
    .select('*, customers(*)')
    .eq('id', id)
    .single();
  if (error || !challan) {
    document.getElementById('save-status').textContent = 'Could not load this challan.';
    return;
  }

  document.getElementById('meta-number').textContent = challan.challan_number || '(auto on save)';
  document.getElementById('meta-date').textContent = new Date(challan.created_at).toLocaleDateString('en-IN');
  document.getElementById('vehicle-no').value = challan.vehicle_no || '';
  document.getElementById('place-of-supply').value = challan.place_of_supply || '';
  document.getElementById('remarks').value = challan.remarks || '';
  const typeInput = document.querySelector(`input[name="challan-type"][value="${challan.challan_type}"]`);
  if (typeInput) typeInput.checked = true;

  if (challan.customers) {
    document.getElementById('customer-id').value = challan.customer_id;
    document.getElementById('customer-input').value = `${challan.customers.name} — ${challan.customers.phone}`;
    fillCustomerBox(challan.customers);
  }

  const { data: items } = await window.supabaseClient
    .from('challan_items')
    .select('*')
    .eq('delivery_challan_id', id)
    .order('sr_no');

  document.getElementById('items-body').innerHTML = '';
  (items && items.length ? items : [{}]).forEach((it) => addRow(it));
}

async function saveChallan() {
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
    vehicle_no: document.getElementById('vehicle-no').value.trim() || null,
    place_of_supply: document.getElementById('place-of-supply').value.trim() || null,
    remarks: document.getElementById('remarks').value.trim() || null,
    challan_type: document.querySelector('input[name="challan-type"]:checked').value,
  };

  const items = Array.from(document.querySelectorAll('#items-body tr')).map((tr, i) => ({
    sr_no: i + 1,
    description: tr.querySelector('.f-desc').value.trim(),
    hsn_sac: tr.querySelector('.f-hsn').value.trim() || null,
    qty: parseFloat(tr.querySelector('.f-qty').value) || 0,
    unit: tr.querySelector('.f-unit').value.trim() || null,
    remarks: tr.querySelector('.f-remarks').value.trim() || null,
  })).filter((it) => it.description);

  if (!items.length) {
    statusEl.textContent = 'Add at least one item with a description.';
    return;
  }

  let id = challanId;

  if (!id) {
    const { data: numberData, error: numError } = await window.supabaseClient
      .rpc('next_document_number', { p_doc_type: 'delivery_challan', p_prefix: 'DC' });
    if (numError) {
      statusEl.textContent = 'Could not generate challan number: ' + numError.message;
      return;
    }
    payload.challan_number = numberData;
    payload.created_by = window.currentUser.id;

    const { data: inserted, error: insertError } = await window.supabaseClient
      .from('delivery_challans').insert(payload).select().single();
    if (insertError) {
      statusEl.textContent = insertError.message;
      return;
    }
    id = inserted.id;
    challanId = id;
    window.history.replaceState({}, '', `delivery-challan-form.html?id=${id}`);
    document.getElementById('meta-number').textContent = inserted.challan_number;
    document.getElementById('form-title').textContent = 'Edit Delivery Challan';
  } else {
    const { error: updateError } = await window.supabaseClient
      .from('delivery_challans').update(payload).eq('id', id);
    if (updateError) {
      statusEl.textContent = updateError.message;
      return;
    }
  }

  await window.supabaseClient.from('challan_items').delete().eq('delivery_challan_id', id);
  const itemsToInsert = items.map((it) => ({ ...it, delivery_challan_id: id }));
  const { error: itemsError } = await window.supabaseClient.from('challan_items').insert(itemsToInsert);
  if (itemsError) {
    statusEl.textContent = 'Saved, but items failed: ' + itemsError.message;
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
