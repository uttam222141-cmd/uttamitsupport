document.addEventListener('erp:ready', async () => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById('from-date').value = toDateInput(firstOfMonth);
  document.getElementById('to-date').value = toDateInput(today);

  document.getElementById('apply-btn').addEventListener('click', runReport);
  document.getElementById('print-gst').addEventListener('click', (e) => {
    e.preventDefault();
    window.print();
  });

  await runReport();
  await loadJobStatusSummary();
  await loadExpiringAmc();
});

function toDateInput(d) {
  return d.toISOString().slice(0, 10);
}

async function runReport() {
  const from = document.getElementById('from-date').value;
  const to = document.getElementById('to-date').value;
  if (!from || !to) return;

  // Supabase date range: include the whole "to" day.
  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);
  const toIso = toExclusive.toISOString().slice(0, 10);

  const [invoicesRes, receiptsRes, outstandingRes] = await Promise.all([
    window.supabaseClient
      .from('invoices')
      .select('invoice_number, created_at, subtotal, discount, gst_percent, tax_type, total, customers(name)')
      .gte('created_at', from)
      .lt('created_at', toIso)
      .order('created_at', { ascending: false }),
    window.supabaseClient
      .from('customer_receipts')
      .select('amount')
      .gte('created_at', from)
      .lt('created_at', toIso),
    window.supabaseClient
      .from('invoices')
      .select('total')
      .neq('payment_status', 'paid'),
  ]);

  renderGstTable(invoicesRes.data || []);

  const totalSales = (invoicesRes.data || []).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const totalReceived = (receiptsRes.data || []).reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const totalGst = (invoicesRes.data || []).reduce((sum, inv) => sum + gstAmountFor(inv), 0);
  const outstanding = (outstandingRes.data || []).reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);

  document.getElementById('stat-total-sales').textContent = formatMoney(totalSales);
  document.getElementById('stat-total-received').textContent = formatMoney(totalReceived);
  document.getElementById('stat-gst-collected').textContent = formatMoney(totalGst);
  document.getElementById('stat-outstanding').textContent = formatMoney(outstanding);
}

function gstAmountFor(inv) {
  const subtotal = parseFloat(inv.subtotal) || 0;
  const discount = parseFloat(inv.discount) || 0;
  const gstPercent = parseFloat(inv.gst_percent) || 0;
  const taxable = Math.max(subtotal - discount, 0);
  return taxable * (gstPercent / 100);
}

function renderGstTable(invoices) {
  const tbody = document.getElementById('gst-body');
  if (!invoices.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="8">No invoices in this range.</td></tr>';
    return;
  }

  let totals = { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };

  const rowsHtml = invoices.map((inv) => {
    const subtotal = parseFloat(inv.subtotal) || 0;
    const discount = parseFloat(inv.discount) || 0;
    const gstPercent = parseFloat(inv.gst_percent) || 0;
    const taxable = Math.max(subtotal - discount, 0);
    let cgst = 0, sgst = 0, igst = 0;
    if (inv.tax_type === 'igst') {
      igst = taxable * (gstPercent / 100);
    } else {
      cgst = taxable * (gstPercent / 200);
      sgst = taxable * (gstPercent / 200);
    }
    const total = parseFloat(inv.total) || 0;

    totals.taxable += taxable;
    totals.cgst += cgst;
    totals.sgst += sgst;
    totals.igst += igst;
    totals.total += total;

    return `
      <tr>
        <td>${escapeHtml(inv.invoice_number || '(draft)')}</td>
        <td>${new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
        <td>${escapeHtml(inv.customers?.name || '—')}</td>
        <td>${taxable.toFixed(2)}</td>
        <td>${cgst.toFixed(2)}</td>
        <td>${sgst.toFixed(2)}</td>
        <td>${igst.toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const totalsRow = `
    <tr style="font-weight:700; border-top:2px solid var(--erp-primary);">
      <td colspan="3">Total</td>
      <td>${totals.taxable.toFixed(2)}</td>
      <td>${totals.cgst.toFixed(2)}</td>
      <td>${totals.sgst.toFixed(2)}</td>
      <td>${totals.igst.toFixed(2)}</td>
      <td>${totals.total.toFixed(2)}</td>
    </tr>
  `;

  tbody.innerHTML = rowsHtml + totalsRow;
}

async function loadJobStatusSummary() {
  const { data, error } = await window.supabaseClient
    .from('repair_jobs')
    .select('status');

  const tbody = document.getElementById('jobstatus-body');
  if (error) {
    tbody.innerHTML = `<tr class="erp-empty-row"><td colspan="2">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="2">No job cards yet.</td></tr>';
    return;
  }

  const counts = {};
  data.forEach((j) => {
    counts[j.status] = (counts[j.status] || 0) + 1;
  });

  tbody.innerHTML = Object.entries(counts).map(([status, count]) => `
    <tr>
      <td>${escapeHtml(formatLabel(status))}</td>
      <td>${count}</td>
    </tr>
  `).join('');
}

async function loadExpiringAmc() {
  const today = new Date();
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const { data, error } = await window.supabaseClient
    .from('amc_agreements')
    .select('agreement_number, end_date, id, customers(name)')
    .eq('status', 'active')
    .gte('end_date', toDateInput(today))
    .lte('end_date', toDateInput(in30))
    .order('end_date');

  const tbody = document.getElementById('amc-expiring-body');
  if (error) {
    tbody.innerHTML = `<tr class="erp-empty-row"><td colspan="4">Could not load: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="4">No AMC agreements expiring in the next 30 days.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((a) => `
    <tr>
      <td>${escapeHtml(a.agreement_number || '(draft)')}</td>
      <td>${escapeHtml(a.customers?.name || '—')}</td>
      <td>${new Date(a.end_date).toLocaleDateString('en-IN')}</td>
      <td><a class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" href="amc-agreement-form.html?id=${a.id}">Open</a></td>
    </tr>
  `).join('');
}

function formatLabel(str) {
  if (!str) return '—';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatMoney(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
