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
      .some((v) =>
