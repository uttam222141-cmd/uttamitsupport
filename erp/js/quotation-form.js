let customersCache = [];
let quotationId = new URLSearchParams(window.location.search).get('id');
let rowCounter = 0;

document.addEventListener('erp:ready', async () => {
  document.getElementById('meta-date').textContent = new Date().toLocaleDateString('en-IN');

  await loadCustomers();

  if (quotationId) {
    document.getElementById('form-title').textContent = 'Edit Quotation';
    await loadQuotation(quotationId);
  } else {
    addRow();
  }

  document.getElementById('customer-input').addEventListener('input', onCustomerPick);
  document.getElementById('add-row-btn').addEventListener('click', () => addRow());
  document.getElementById('t-discount').addEventListener('input', recalcTotals);
  document.getElementById('t-gst-percent').addEventListener('input', recalcTotals);
  document.getElementById('save-btn').addEventListener('click', saveQuotation);
  document.getElementById('print-btn').addEventListener('click', () => window.print());
});

async function loadCustomers() {
  const { data, error } = await window.supabaseClient
    .from('customers')
    .select('id, name, phone, company_name, email, gst, address')
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
  document.getElementById('p-gst').textContent = c.gst || '—';
  document.getElementById('p-address').textContent = c.address || '—';
}

function addRow(item) {
  rowCounter++;
  const tbody = document.getElementById('items-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="num">${tbody.children.length + 1}</td>
    <td><input type="text" class="f-desc" value="${escapeAttr(item?.description)}"></td>
    <td><input type="text" class="f-brand" value="${escapeAttr(item?.brand_model)}"></td>
    <td><input type="text" class="f-specs" value="${escapeAttr(item?.specifications)}"></td>
    <td><input type="number" class="f-qty" value="${item?.qty ?? 1}" min="0" step="1"></td>
    <td><input type="number" class="f-price" value="${item?.unit_price ?? 0}" min="0" step="0.01"></td>
    <td class="num f-total">0.00</td>
    <td><button type="button" class="row-remove">&times;</button></td>
  `;
  tbody.appendChild(tr);

  tr.querySelector('.f-qty').addEventListener('input', () => updateRowTotal(tr));
  tr.querySelector('.f-price').addEventListener('input', () => updateRowTotal(tr));
  tr.querySelector('.row-remove').addEventListener('click', () => {
    tr.remove();
    renumberRows();
    recalcTotals();
  });
  updateRowTotal(tr);
}

function updateRowTotal(tr) {
  const qty = parseFloat(tr.querySelector('.f-qty').value) || 0;
  const price = parseFloat(tr.querySelector('.f-price').value) || 0;
  tr.querySelector('.f-total').textContent = (qty * price).toFixed(2);
  recalcTotals();
}

function renumberRows() {
  document.querySelectorAll('#items-body tr').forEach((tr, i) => {
    tr.querySelector('td.num').textContent = i + 1;
  });
}

function recalcTotals() {
  let subtotal = 0;
  document.querySelectorAll('#items-body tr').forEach((tr) => {
    subtotal += parseFloat(tr.querySelector('.f-total').textContent) || 0;
  });
  const discount = parseFloat(document.getElementById('t-discount').value) || 0;
  const gstPercent = parseFloat(document.getElementById('t-gst-percent').value) || 0;
  const taxable = Math.max(subtotal - discount, 0);
  const gstAmount = taxable * (gstPercent / 100);
  const grand = taxable + gstAmount;

  document.getElementById('t-subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('t-gst-amount').textContent = gstAmount.toFixed(2);
  document.getElementById('t-grand').textContent = grand.toFixed(2);
}

async function loadQuotation(id) {
  const { data: quo, error } = await window.supabaseClient
    .from('quotations')
    .select('*, customers(*)')
    .eq('id', id)
    .single();
  if (error || !quo) {
    document.getElementById('save-status').textContent = 'Could not load this quotation.';
    return;
  }

  document.getElementById('meta-number').textContent = quo.quotation_number || '(auto on save)';
  document.getElementById('meta-date').textContent = new Date(quo.created_at).toLocaleDateString('en-IN');
  document.getElementById('valid-till').value = quo.valid_till || '';
  document.getElementById('reference-no').value = quo.reference_no || '';
  document.getElementById('doc-notes').value = quo.notes || '';
  document.getElementById('t-discount').value = quo.discount || 0;
  document.getElementById('t-gst-percent').value = quo.gst_percent || 0;

  if (quo.customers) {
    document.getElementById('customer-id').value = quo.customer_id;
    document.getElementById('customer-input').value = `${quo.customers.name} — ${quo.customers.phone}`;
    fillCustomerBox(quo.customers);
  }

  const { data: items } = await window.supabaseClient
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', id)
    .order('sr_no');

  document.getElementById('items-body').innerHTML = '';
  (items && items.length ? items : [{}]).forEach((it) => addRow(it));
  recalcTotals();
}

async function saveQuotation() {
  const statusEl = document.getElementById('save-status');
  statusEl.textContent = '';
  statusEl.style.color = '';

  const customerId = document.getElementById('customer-id').value;
  if (!customerId) {
    statusEl.textContent = 'Please select a customer first.';
    return;
  }

  const rows = Array.from(document.querySelectorAll('#items-body tr')).map((tr, i) => ({
    sr_no: i + 1,
    description: tr.querySelector('.f-desc').value.trim(),
    brand_model: tr.querySelector('.f-brand').value.trim() || null,
    specifications: tr.querySelector('.f-specs').value.trim() || null,
    qty: parseFloat(tr.querySelector('.f-qty').value) || 0,
    unit_price: parseFloat(tr.querySelector('.f-price').value) || 0,
  })).filter((r) => r.description);

  if (!rows.length) {
    statusEl.textContent = 'Add at least one item with a description.';
    return;
  }

  const subtotal = parseFloat(document.getElementById('t-subtotal').textContent) || 0;
  const discount = parseFloat(document.getElementById('t-discount').value) || 0;
  const gstPercent = parseFloat(document.getElementById('t-gst-percent').value) || 0;
  const grand = parseFloat(document.getElementById('t-grand').textContent) || 0;

  const payload = {
    customer_id: customerId,
    valid_till: document.getElementById('valid-till').value || null,
    notes: document.getElementById('doc-notes').value.trim() || null,
    subtotal,
    discount,
    gst_percent: gstPercent,
    total: grand,
  };

  let id = quotationId;

  if (!id) {
    const { data: numberData, error: numError } = await window.supabaseClient
      .rpc('next_document_number', { p_doc_type: 'quotation', p_prefix: 'QTN' });
    if (numError) {
      statusEl.textContent = 'Could not generate quotation number: ' + numError.message;
      return;
    }
    payload.quotation_number = numberData;
    payload.created_by = window.currentUser.id;

    const { data: inserted, error: insertError } = await window.supabaseClient
      .from('quotations').insert(payload).select().single();
    if (insertError) {
      statusEl.textContent = insertError.message;
      return;
    }
    id = inserted.id;
    quotationId = id;
    window.history.replaceState({}, '', `quotation-form.html?id=${id}`);
    document.getElementById('meta-number').textContent = inserted.quotation_number;
    document.getElementById('form-title').textContent = 'Edit Quotation';
  } else {
    const { error: updateError } = await window.supabaseClient
      .from('quotations').update(payload).eq('id', id);
    if (updateError) {
      statusEl.textContent = updateError.message;
      return;
    }
  }

  // Replace all line items for this quotation
  await window.supabaseClient.from('quotation_items').delete().eq('quotation_id', id);
  const itemsToInsert = rows.map((r) => ({ ...r, quotation_id: id }));
  const { error: itemsError } = await window.supabaseClient.from('quotation_items').insert(itemsToInsert);
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
