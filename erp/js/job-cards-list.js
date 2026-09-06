let customersCache = [];
let jobId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('erp:ready', async () => {
  document.getElementById('meta-date').textContent = new Date().toLocaleDateString('en-IN');

  await loadCustomers();

  if (jobId) {
    document.getElementById('form-title').textContent = 'Edit Job Card';
    await loadJob(jobId);
  } else {
    addRow();
  }

  document.getElementById('customer-input').addEventListener('input', onCustomerPick);
  document.getElementById('add-row-btn').addEventListener('click', () => addRow());
  document.getElementById('save-btn').addEventListener('click', saveJob);
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

async function loadJob(id) {
  const { data: job, error } = await window.supabaseClient
    .from('repair_jobs')
    .select('*, customers(*)')
    .eq('id', id)
    .single();
  if (error || !job) {
    document.getElementById('save-status').textContent = 'Could not load this job card.';
    return;
  }

  document.getElementById('meta-number').textContent = job.job_number || '(auto on save)';
  document.getElementById('meta-date').textContent = new Date(job.created_at).toLocaleDateString('en-IN');
  document.getElementById('expected-delivery').value = job.expected_delivery || '';
  document.getElementById('engineer-name').value = job.engineer_name || '';
  document.getElementById('device-type').value = job.device_type || 'Laptop';
  document.getElementById('device-brand').value = job.brand || '';
  document.getElementById('device-model').value = job.model || '';
  document.getElementById('serial-no').value = job.serial_no || '';
  document.getElementById('device-password').value = job.device_password || '';
  document.getElementById('accessories').value = job.accessories || '';
  document.getElementById('problem-description').value = job.problem_description || '';
  document.getElementById('diagnosis').value = job.diagnosis || '';
  document.getElementById('solution-action').value = job.solution_action || '';
  document.getElementById('remarks').value = job.remarks || '';
  const statusInput = document.querySelector(`input[name="job-status"][value="${job.status}"]`);
  if (statusInput) statusInput.checked = true;

  if (job.customers) {
    document.getElementById('customer-id').value = job.customer_id;
    document.getElementById('customer-input').value = `${job.customers.name} — ${job.customers.phone}`;
    fillCustomerBox(job.customers);
  }

  const { data: parts } = await window.supabaseClient
    .from('repair_parts')
    .select('*')
    .eq('repair_job_id', id)
    .order('sr_no');

  document.getElementById('items-body').innerHTML = '';
  (parts && parts.length ? parts : [{}]).forEach((p) => addRow(p));
}

async function saveJob() {
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
    expected_delivery: document.getElementById('expected-delivery').value || null,
    engineer_name: document.getElementById('engineer-name').value.trim() || null,
    device_type: document.getElementById('device-type').value,
    brand: document.getElementById('device-brand').value.trim() || null,
    model: document.getElementById('device-model').value.trim() || null,
    serial_no: document.getElementById('serial-no').value.trim() || null,
    device_password: document.getElementById('device-password').value.trim() || null,
    accessories: document.getElementById('accessories').value.trim() || null,
    problem_description: document.getElementById('problem-description').value.trim() || null,
    diagnosis: document.getElementById('diagnosis').value.trim() || null,
    solution_action: document.getElementById('solution-action').value.trim() || null,
    remarks: document.getElementById('remarks').value.trim() || null,
    status: document.querySelector('input[name="job-status"]:checked').value,
  };

  const parts = Array.from(document.querySelectorAll('#items-body tr')).map((tr, i) => ({
    sr_no: i + 1,
    description: tr.querySelector('.f-desc').value.trim(),
    qty: parseFloat(tr.querySelector('.f-qty').value) || 0,
    unit: tr.querySelector('.f-unit').value.trim() || null,
    remarks: tr.querySelector('.f-remarks').value.trim() || null,
  })).filter((p) => p.description);

  let id = jobId;

  if (!id) {
    const { data: numberData, error: numError } = await window.supabaseClient
      .rpc('next_document_number', { p_doc_type: 'repair_job', p_prefix: 'JOB' });
    if (numError) {
      statusEl.textContent = 'Could not generate job number: ' + numError.message;
      return;
    }
    payload.job_number = numberData;
    payload.created_by = window.currentUser.id;

    const { data: inserted, error: insertError } = await window.supabaseClient
      .from('repair_jobs').insert(payload).select().single();
    if (insertError) {
      statusEl.textContent = insertError.message;
      return;
    }
    id = inserted.id;
    jobId = id;
    window.history.replaceState({}, '', `job-card-form.html?id=${id}`);
    document.getElementById('meta-number').textContent = inserted.job_number;
    document.getElementById('form-title').textContent = 'Edit Job Card';
  } else {
    const { error: updateError } = await window.supabaseClient
      .from('repair_jobs').update(payload).eq('id', id);
    if (updateError) {
      statusEl.textContent = updateError.message;
      return;
    }
  }

  await window.supabaseClient.from('repair_parts').delete().eq('repair_job_id', id);
  if (parts.length) {
    const partsToInsert = parts.map((p) => ({ ...p, repair_job_id: id }));
    const { error: partsError } = await window.supabaseClient.from('repair_parts').insert(partsToInsert);
    if (partsError) {
      statusEl.textContent = 'Saved, but parts failed: ' + partsError.message;
      return;
    }
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
