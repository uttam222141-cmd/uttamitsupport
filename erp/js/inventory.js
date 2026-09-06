let allItems = [];

document.addEventListener('erp:ready', () => {
  loadItems();

  document.getElementById('open-add-item')?.addEventListener('click', () => openModal());
  document.getElementById('close-item-modal').addEventListener('click', closeModal);
  document.getElementById('cancel-item-form').addEventListener('click', closeModal);
  document.getElementById('item-modal').addEventListener('click', (e) => {
    if (e.target.id === 'item-modal') closeModal();
  });
  document.getElementById('item-form').addEventListener('submit', saveItem);
  document.getElementById('item-search').addEventListener('input', (e) => {
    renderItems(filterItems(e.target.value));
  });
});

async function loadItems() {
  const { data, error } = await window.supabaseClient
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('items-body').innerHTML =
      `<tr class="erp-empty-row"><td colspan="7">Could not load inventory: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  allItems = data;
  renderItems(allItems);
}

function filterItems(term) {
  const q = term.trim().toLowerCase();
  if (!q) return allItems;
  return allItems.filter((it) =>
    [it.product, it.brand, it.model, it.serial_number, it.asset_id].filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  );
}

function renderItems(rows) {
  const tbody = document.getElementById('items-body');
  const canEdit = ['admin', 'technician'].includes(window.currentProfile?.role);

  if (!rows.length) {
    tbody.innerHTML = '<tr class="erp-empty-row"><td colspan="7">No inventory items found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((it) => `
    <tr>
      <td>${escapeHtml(it.product)}</td>
      <td>${escapeHtml([it.brand, it.model].filter(Boolean).join(' ') || '—')}</td>
      <td>${escapeHtml([it.processor, it.ram, it.storage].filter(Boolean).join(' · ') || '—')}</td>
      <td>${escapeHtml(it.serial_number || '—')}</td>
      <td>${it.quantity ?? 0}</td>
      <td>₹${Number(it.selling_price || 0).toLocaleString('en-IN')}</td>
      <td>
        ${canEdit ? `
          <button class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem;" onclick="editItem('${it.id}')">Edit</button>
          ${window.currentProfile.role === 'admin' ? `<button class="btn btn-ghost" style="padding:6px 10px; font-size:.8rem; color:#B3401D; border-color:#F0C9BC;" onclick="deleteItem('${it.id}')">Delete</button>` : ''}
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function openModal(item) {
  document.getElementById('item-form-error').textContent = '';
  document.getElementById('item-modal-title').textContent = item ? 'Edit Inventory Item' : 'New Inventory Item';
  document.getElementById('item-id').value = item?.id || '';
  document.getElementById('i-product').value = item?.product || '';
  document.getElementById('i-brand').value = item?.brand || '';
  document.getElementById('i-model').value = item?.model || '';
  document.getElementById('i-processor').value = item?.processor || '';
  document.getElementById('i-ram').value = item?.ram || '';
  document.getElementById('i-storage').value = item?.storage || '';
  document.getElementById('i-os').value = item?.os || '';
  document.getElementById('i-serial').value = item?.serial_number || '';
  document.getElementById('i-asset').value = item?.asset_id || '';
  document.getElementById('i-warranty').value = item?.warranty || '';
  document.getElementById('i-quantity').value = item?.quantity ?? 1;
  document.getElementById('i-purchase-price').value = item?.purchase_price ?? '';
  document.getElementById('i-selling-price').value = item?.selling_price ?? '';
  document.getElementById('i-notes').value = item?.notes || '';
  document.getElementById('item-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('item-modal').classList.remove('open');
}

function editItem(id) {
  const it = allItems.find((x) => x.id === id);
  if (it) openModal(it);
}

async function saveItem(e) {
  e.preventDefault();
  const errorEl = document.getElementById('item-form-error');
  errorEl.textContent = '';

  const id = document.getElementById('item-id').value;
  const payload = {
    product: document.getElementById('i-product').value.trim(),
    brand: document.getElementById('i-brand').value.trim() || null,
    model: document.getElementById('i-model').value.trim() || null,
    processor: document.getElementById('i-processor').value.trim() || null,
    ram: document.getElementById('i-ram').value.trim() || null,
    storage: document.getElementById('i-storage').value.trim() || null,
    os: document.getElementById('i-os').value.trim() || null,
    serial_number: document.getElementById('i-serial').value.trim() || null,
    asset_id: document.getElementById('i-asset').value.trim() || null,
    warranty: document.getElementById('i-warranty').value.trim() || null,
    quantity: parseInt(document.getElementById('i-quantity').value, 10) || 0,
    purchase_price: parseFloat(document.getElementById('i-purchase-price').value) || 0,
    selling_price: parseFloat(document.getElementById('i-selling-price').value) || 0,
    notes: document.getElementById('i-notes').value.trim() || null,
  };

  let result;
  if (id) {
    result = await window.supabaseClient.from('inventory').update(payload).eq('id', id).select().single();
  } else {
    payload.created_by = window.currentUser.id;
    result = await window.supabaseClient.from('inventory').insert(payload).select().single();
  }

  if (result.error) {
    errorEl.textContent = result.error.message;
    return;
  }

  closeModal();
  loadItems();
}

async function deleteItem(id) {
  if (!confirm('Delete this inventory item? This cannot be undone.')) return;
  const { error } = await window.supabaseClient.from('inventory').delete().eq('id', id);
  if (error) {
    alert('Could not delete: ' + error.message);
    return;
  }
  loadItems();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
