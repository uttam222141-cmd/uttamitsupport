let customersCache = [];
let receiptId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('erp:ready', async () => {
  document.getElementById('meta-date').textContent = new Date().toLocaleDateString('en-IN');

  await loadCustomers();

  if (receiptId) {
    document.getElementById('form-title').textContent = 'Edit Customer Receipt';
    await loadReceipt(receiptId);
  } else {
    updateAmountWords();
  }

  document.getElementById('customer-input').addEventListener('input', onCustomerPick);
  document.getElementById('amount').addEventListener('input', updateAmountWords);
  document.getElementById('save-btn').addEventListener('click', saveReceipt);
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
}

function updateAmountWords() {
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  document.getElementById('amount-words').textContent =
    amount > 0 ? numberToIndianWords(Math.round(amount)) + ' Rupees Only' : '—';
}

async function loadReceipt(id) {
  const { data: receipt, error } = await window.supabaseClient
    .from('customer_receipts')
    .select('*, customers(*)')
    .eq('id', id)
    .single();
  if (error || !receipt) {
    document.getElementById('save-status').textContent = 'Could not load this receipt.';
    return;
  }

  document.getElementById('meta-number').textContent = receipt.receipt_number || '(auto on save)';
  document.getElementById('meta-date').textContent = new Date(receipt.created_at).toLocaleDateString('en-IN');
  document.getElementById('amount').value = receipt.amount ?? 0;
  document.getElementById('payment-mode').value = receipt.payment_mode || 'cash';
  document.getElementById('reference-no').value = receipt.reference_no || '';
  document.getElementById('against-invoice').value = receipt.against_invoice || '';
  document.getElementById('remarks').value = receipt.remarks || '';
  updateAmountWords();

  if (receipt.customers) {
    document.getElementById('customer-id').value = receipt.customer_id;
    document.getElementById('customer-input').value = `${receipt.customers.name} — ${receipt.customers.phone}`;
    fillCustomerBox(receipt.customers);
  }
}

async function saveReceipt() {
  const statusEl = document.getElementById('save-status');
  statusEl.textContent = '';
  statusEl.style.color = '';

  const customerId = document.getElementById('customer-id').value;
  if (!customerId) {
    statusEl.textContent = 'Please select a customer first.';
    return;
  }

  const amount = parseFloat(document.getElementById('amount').value) || 0;
  if (amount <= 0) {
    statusEl.textContent = 'Please enter a valid amount received.';
    return;
  }

  const payload = {
    customer_id: customerId,
    amount,
    payment_mode: document.getElementById('payment-mode').value,
    reference_no: document.getElementById('reference-no').value.trim() || null,
    against_invoice: document.getElementById('against-invoice').value.trim() || null,
    remarks: document.getElementById('remarks').value.trim() || null,
  };

  let id = receiptId;

  if (!id) {
    const { data: numberData, error: numError } = await window.supabaseClient
      .rpc('next_document_number', { p_doc_type: 'customer_receipt', p_prefix: 'RCPT' });
    if (numError) {
      statusEl.textContent = 'Could not generate receipt number: ' + numError.message;
      return;
    }
    payload.receipt_number = numberData;
    payload.created_by = window.currentUser.id;

    const { data: inserted, error: insertError } = await window.supabaseClient
      .from('customer_receipts').insert(payload).select().single();
    if (insertError) {
      statusEl.textContent = insertError.message;
      return;
    }
    id = inserted.id;
    receiptId = id;
    window.history.replaceState({}, '', `receipt-form.html?id=${id}`);
    document.getElementById('meta-number').textContent = inserted.receipt_number;
    document.getElementById('form-title').textContent = 'Edit Customer Receipt';
  } else {
    const { error: updateError } = await window.supabaseClient
      .from('customer_receipts').update(payload).eq('id', id);
    if (updateError) {
      statusEl.textContent = updateError.message;
      return;
    }
  }

  statusEl.style.color = '#1B7F3A';
  statusEl.textContent = 'Saved successfully.';
}

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
