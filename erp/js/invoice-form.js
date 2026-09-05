let customersCache = [];
let invoiceId = new URLSearchParams(window.location.search).get('id');
let fromQuotationId = new URLSearchParams(window.location.search).get('from_quotation');

document.addEventListener('erp:ready', async () => {
  document.getElementById('meta-date').textContent = new Date().toLocaleDateString('en-IN');

  await loadCustomers();

  if (invoiceId) {
    document.getElementById('form-title').textContent = 'Edit Invoice';
    await loadInvoice(invoiceId);
  } else if (fromQuotationId) {
    document.getElementById('form-title').textContent = 'New Invoice (from Quotation)';
    await prefillFromQuotation(fromQuotationId);
  } else {
    addRow();
  }

  document.getElementById('customer-input').addEventListener('input', onCustomerPick);
  document.getElementById('add-row-btn').addEventListener('click', () => addRow());
  document.getElementById('t-discount').addEventListener('input', recalcTotals);
  document.getElementById('t-gst-percent').addEventListener('input', recalcTotals);
  document.querySelectorAll('input[name="tax-type"]').forEach((r) => r.addEventListener('change', recalcTotals));
  document.getElementById('save-btn').addEventListener('click', saveInvoice);
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
  const tbody = document.getElementById('items-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="num">${tbody.children.length + 1}</td>
    <td><input type="text" class="f-desc" value="${escapeAttr(item?.description)}"></td>
    <td><input type="text" class="f-hsn" value="${escapeAttr(item?.hsn_sac)}"></td>
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

function getTaxType() {
  return document.querySelector('input[name="tax-type"]:checked').value;
}

function recalcTotals() {
  let subtotal = 0;
  document.querySelectorAll('#items-body tr').forEach((tr) => {
    subtotal += parseFloat(tr.querySelector('.f-total').textContent) || 0;
  });
  const discount = parseFloat(document.getElementById('t-discount').value) || 0;
  const gstPercent = parseFloat(document.getElementById('t-gst-percent').value) || 0;
  const taxable = Math.max(subtotal - discount, 0);
  const taxType = getTaxType();

  let cgst = 0, sgst = 0, igst = 0;
  if (taxType === 'igst') {
    igst = taxable * (gstPercent / 100);
    document.getElementById('row-cgst').style.display = 'none';
    document.getElementById('row-sgst').style.display = 'none';
    document.getElementById('row-igst').style.display = '';
  } else {
    cgst = taxable * (gstPercent / 200);
    sgst = taxable * (gstPercent / 200);
    document.getElementById('row-cgst').style.display = '';
    document.getElementById('row-sgst').style.display = '';
    document.getElementById('row-igst').style.display = 'none';
  }
  const grand = taxable + cgst + sgst + igst;

  document.getElementById('t-subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('t-taxable').textContent = taxable.toFixed(2);
  document.getElementById('t-cgst').textContent = cgst.toFixed(2);
  document.getElementById('t-sgst').textContent = sgst.toFixed(2);
  document.getElementById('t-igst').textContent = igst.toFixed(2);
  document.getElementById('t-grand').textContent = grand.toFixed(2);
  document.getElementById('amount-words').textContent = numberToIndianWords(Math.round(grand)) + ' Rupees Only';
}

async function prefillFromQuotation(quoId) {
  const { data: quo, error } = await window.supabaseClient
    .from('quotations')
    .select('*, customers(*)')
    .eq('id', quoId)
    .single();
  if (error || !quo) return;

  if (quo.customers) {
    document.getElementById('customer-id').value = quo.customer_id;
    document.getElementById('customer-input').value = `${quo.customers.name} — ${quo.customers.phone}`;
    fillCustomerBox(quo.customers);
  }
  document.getElementById('reference-no').value = quo.quotation_number || '';
  document.getElementById('t-discount').value = quo.discount || 0;
  document.getElementById('t-gst-percent').value = quo.gst_percent || 18;

  const { data: items } = await window.supabaseClient
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', quoId)
    .order('sr_no');

  document.getElementById('items-body').innerHTML = '';
  (items && items.length ? items : [{}]).forEach((it) =>
    addRow({ description: it.description, hsn_sac: '', qty: it.qty, unit_price: it.unit_price })
  );
  document.getElementById('doc-sheet').dataset.fromQuotation = quoId;
  recalcTotals();
}

async function loadInvoice(id) {
  const { data: inv, error } = await window.supabaseClient
    .from('invoices')
    .select('*, customers(*)')
    .eq('id', id)
    .single();
  if (error || !inv) {
    document.getElementById('save-status').textContent = 'Could not load this invoice.';
    return;
  }

  document.getElementById('meta-number').textContent = inv.invoice_number || '(auto on save)';
  document.getElementById('meta-date').textContent = new Date(inv.created_at).toLocaleDateString('en-IN');
  document.getElementById('due-date').value = inv.due_date || '';
  document.getElementById('reference-no').value = inv.reference_no || '';
  document.getElementById('t-discount').value = inv.discount || 0;
  document.getElementById('t-gst-percent').value = inv.gst_percent || 0;
  document.getElementById('payment-status').value = inv.payment_status || 'unpaid';
  document.querySelector(`input[name="tax-type"][value="${inv.tax_type || 'cgst_sgst'}"]`).checked = true;

  if (inv.customers) {
    document.getElementById('customer-id').value = inv.customer_id;
    document.getElementById('customer-input').value = `${inv.customers.name} — ${inv.customers.phone}`;
    fillCustomerBox(inv.customers);
  }

  const { data: items } = await window.supabaseClient
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sr_no');

  document.getElementById('items-body').innerHTML = '';
  (items && items.length ? items : [{}]).forEach((it) => addRow(it));
  recalcTotals();
}

async function saveInvoice() {
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
    hsn_sac: tr.querySelector('.f-hsn').value.trim() || null,
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
    due_date: document.getElementById('due-date').value || null,
    reference_no: document.getElementById('reference-no').value.trim() || null,
    subtotal,
    discount,
    gst_percent: gstPercent,
    tax_type: getTaxType(),
    total: grand,
    payment_status: document.getElementById('payment-status').value,
  };

  const fromQuo = document.getElementById('doc-sheet').dataset.fromQuotation;
  if (fromQuo) payload.quotation_id = fromQuo;

  let id = invoiceId;

  if (!id) {
    const { data: numberData, error: numError } = await window.supabaseClient
      .rpc('next_document_number', { p_doc_type: 'invoice', p_prefix: 'INV' });
    if (numError) {
      statusEl.textContent = 'Could not generate invoice number: ' + numError.message;
      return;
    }
    payload.invoice_number = numberData;
    payload.created_by = window.currentUser.id;

    const { data: inserted, error: insertError } = await window.supabaseClient
      .from('invoices').insert(payload).select().single();
    if (insertError) {
      statusEl.textContent = insertError.message;
      return;
    }
    id = inserted.id;
    invoiceId = id;
    window.history.replaceState({}, '', `invoice-form.html?id=${id}`);
    document.getElementById('meta-number').textContent = inserted.invoice_number;
    document.getElementById('form-title').textContent = 'Edit Invoice';

    if (fromQuo) {
      await window.supabaseClient.from('quotations').update({ status: 'converted' }).eq('id', fromQuo);
    }
  } else {
    const { error: updateError } = await window.supabaseClient
      .from('invoices').update(payload).eq('id', id);
    if (updateError) {
      statusEl.textContent = updateError.message;
      return;
    }
  }

  await window.supabaseClient.from('invoice_items').delete().eq('invoice_id', id);
  const itemsToInsert = rows.map((r) => ({ ...r, invoice_id: id }));
  const { error: itemsError } = await window.supabaseClient.from('invoice_items').insert(itemsToInsert);
  if (itemsError) {
    statusEl.textContent = 'Saved, but items failed: ' + itemsError.message;
    return;
  }

  statusEl.style.color = '#1B7F3A';
  statusEl.textContent = 'Saved successfully.';
}

/* ---------- Number to Indian words (for "Amount in Words") ---------- */
function numberToIndianWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function threeDigits(n) {
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
  }

  let result = '';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;

  if (crore) result += threeDigits(crore) + ' Crore ';
  if (lakh) result += threeDigits(lakh) + ' Lakh ';
  if (thousand) result += threeDigits(thousand) + ' Thousand ';
  if (hundred) result += threeDigits(hundred);

  return result.trim();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
