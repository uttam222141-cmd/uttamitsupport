// ==========================================================
// UTTAM IT SUPPORT — site interactivity
// ==========================================================

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Mobile menu ---------- */
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
hamburger.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
});
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}));

/* ---------- Services data ---------- */
const SERVICES = [
  { title: 'Laptop Repair', items: ['Display replacement','Keyboard replacement','Battery replacement','Charging problem','Heating problem','Motherboard diagnosis'] },
  { title: 'Desktop Repair', items: ['PC troubleshooting','Power issues','Windows problems','Hardware upgrades','Performance optimization'] },
  { title: 'SSD Upgrade', items: ['HDD to SSD upgrade','SSD installation','Windows migration','Performance optimization'] },
  { title: 'RAM Upgrade', items: ['RAM installation','Compatibility checking','Performance upgrade'] },
  { title: 'Windows & Software', items: ['Windows installation','Driver installation','Microsoft Office setup','Software installation','System optimization'] },
  { title: 'Virus & Security', items: ['Virus removal','Malware cleanup','System security','Browser cleanup'] },
  { title: 'Printer Support', items: ['Printer installation','Driver setup','Network printer','Printing troubleshooting'] },
  { title: 'Networking', items: ['LAN setup','Wi-Fi setup','Router configuration','Switch configuration','Network troubleshooting'] },
  { title: 'CCTV', items: ['IP camera setup','NVR configuration','Camera troubleshooting','Remote viewing setup'] },
  { title: 'Data Services', items: ['Data backup','Data transfer','Hard disk support','Basic data recovery assistance'] },
];

const servicesGrid = document.getElementById('services-grid');
servicesGrid.innerHTML = SERVICES.map(s => `
  <div class="service-card">
    <h3>${s.title}</h3>
    <ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul>
    <a class="link-arrow" href="#contact">Learn More</a>
  </div>
`).join('');

/* ---------- Refurbished product data (sample / placeholder) ---------- */
const PRODUCTS = [
  {
    id: 'p1', brand: 'Dell', model: 'Latitude Business Laptop', type:'laptop',
    tags: ['laptop','business','i5','8gb','ssd'],
    processor: 'Intel Core i5', gen:'8th/10th Gen (varies by unit)', ram: '8GB RAM', storage: '256GB SSD',
    display: '14-inch HD', graphics:'Integrated', os:'Windows (genuine, installed on request)',
    battery:'Tested, backup varies by unit', condition: 'Refurbished — Grade A/B', warranty: 'Contact for warranty terms',
    price: 'Contact for Price', availability: 'Check Availability'
  },
  {
    id: 'p2', brand: 'HP', model: 'ProBook Business Laptop', type:'laptop',
    tags: ['laptop','business','i5','8gb','ssd'],
    processor: 'Intel Core i5', gen:'7th/8th Gen (varies by unit)', ram: '8GB RAM', storage: '256GB SSD',
    display: '14-inch HD', graphics:'Integrated', os:'Windows (genuine, installed on request)',
    battery:'Tested, backup varies by unit', condition: 'Refurbished — Grade A/B', warranty: 'Contact for warranty terms',
    price: 'Contact for Price', availability: 'Check Availability'
  },
  {
    id: 'p3', brand: 'Lenovo', model: 'ThinkPad Compact Laptop', type:'laptop',
    tags: ['laptop','business','i3','8gb'],
    processor: 'Intel Core i3', gen:'6th/7th Gen (varies by unit)', ram: '8GB RAM', storage: '500GB HDD / SSD option',
    display: '14-inch HD', graphics:'Integrated', os:'Windows (genuine, installed on request)',
    battery:'Tested, backup varies by unit', condition: 'Refurbished — Grade B', warranty: 'Contact for warranty terms',
    price: 'Contact for Price', availability: 'Check Availability'
  },
  {
    id: 'p4', brand: 'Dell', model: 'OptiPlex Desktop', type:'desktop',
    tags: ['desktop','i5','8gb','ssd'],
    processor: 'Intel Core i5', gen:'6th/7th Gen (varies by unit)', ram: '8GB RAM', storage: '256GB SSD',
    display: 'Monitor available separately', graphics:'Integrated', os:'Windows (genuine, installed on request)',
    battery:'—', condition: 'Refurbished — Tested', warranty: 'Contact for warranty terms',
    price: 'Contact for Price', availability: 'Check Availability'
  },
  {
    id: 'p5', brand: 'HP', model: 'EliteDesk Mini Desktop', type:'desktop',
    tags: ['desktop','i7','16gb','ssd'],
    processor: 'Intel Core i7', gen:'7th/8th Gen (varies by unit)', ram: '16GB RAM', storage: '512GB SSD',
    display: 'Monitor available separately', graphics:'Integrated', os:'Windows (genuine, installed on request)',
    battery:'—', condition: 'Refurbished — Tested', warranty: 'Contact for warranty terms',
    price: 'Contact for Price', availability: 'Check Availability'
  },
  {
    id: 'p6', brand: 'Lenovo', model: 'ThinkCentre Desktop', type:'desktop',
    tags: ['desktop','i3','8gb'],
    processor: 'Intel Core i3', gen:'6th Gen (varies by unit)', ram: '8GB RAM', storage: '500GB HDD',
    display: 'Monitor available separately', graphics:'Integrated', os:'Windows (genuine, installed on request)',
    battery:'—', condition: 'Refurbished — Tested', warranty: 'Contact for warranty terms',
    price: 'Contact for Price', availability: 'Check Availability'
  },
];

const productGrid = document.getElementById('product-grid');

function productCardHTML(p){
  return `
  <div class="product-card" data-tags="${p.tags.join(',')}">
    <div class="product-thumb">
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
        <rect x="3" y="4" width="18" height="12" rx="1.5"/>
        <line x1="7" y1="20" x2="17" y2="20"/>
        <line x1="12" y1="16" x2="12" y2="20"/>
      </svg>
    </div>
    <div class="product-body">
      <span class="product-brand">${p.brand}</span>
      <span class="product-title">${p.model}</span>
      <div class="spec-row">
        <span class="spec-tag">${p.processor}</span>
        <span class="spec-tag">${p.ram}</span>
        <span class="spec-tag">${p.storage}</span>
      </div>
      <span class="product-avail">${p.condition} · ${p.availability}</span>
      <span class="product-price">${p.price}</span>
      <div class="product-actions">
        <button class="btn btn-outline" onclick="openProduct('${p.id}')">View Details</button>
        <a class="btn btn-solid" target="_blank" rel="noopener" href="https://wa.me/918887961171?text=${encodeURIComponent('Hello Uttam IT Support, I am interested in ' + p.brand + ' ' + p.model + '. Please share availability and price.')}">WhatsApp Enquiry</a>
      </div>
    </div>
  </div>`;
}

function renderProducts(list){
  productGrid.innerHTML = list.map(productCardHTML).join('');
}
renderProducts(PRODUCTS);

/* ---------- Filters ---------- */
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const f = chip.dataset.filter;
    if (f === 'all') { renderProducts(PRODUCTS); return; }
    renderProducts(PRODUCTS.filter(p => p.tags.includes(f)));
  });
});

/* ---------- Product modal ---------- */
const modal = document.getElementById('product-modal');
const modalBody = document.getElementById('modal-body');
document.getElementById('modal-close').addEventListener('click', closeProduct);
modal.addEventListener('click', (e) => { if (e.target === modal) closeProduct(); });

function openProduct(id){
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  modalBody.innerHTML = `
    <div class="modal-gallery">
      <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
        <rect x="3" y="4" width="18" height="12" rx="1.5"/>
        <line x1="7" y1="20" x2="17" y2="20"/>
        <line x1="12" y1="16" x2="12" y2="20"/>
      </svg>
    </div>
    <span class="product-brand">${p.brand}</span>
    <h3 id="modal-title" class="product-title" style="font-size:1.3rem;">${p.model}</h3>
    <div class="modal-specs">
      <div><span>Processor</span>${p.processor}</div>
      <div><span>Generation</span>${p.gen}</div>
      <div><span>RAM</span>${p.ram}</div>
      <div><span>Storage</span>${p.storage}</div>
      <div><span>Display</span>${p.display}</div>
      <div><span>Graphics</span>${p.graphics}</div>
      <div><span>Operating System</span>${p.os}</div>
      <div><span>Battery Condition</span>${p.battery}</div>
      <div><span>Physical Condition</span>${p.condition}</div>
      <div><span>Warranty</span>${p.warranty}</div>
      <div><span>Price</span>${p.price}</div>
      <div><span>Availability</span>${p.availability}</div>
    </div>
    <div class="modal-actions">
      <a class="btn btn-solid" target="_blank" rel="noopener" href="https://wa.me/918887961171?text=${encodeURIComponent('Hello Uttam IT Support, I am interested in ' + p.brand + ' ' + p.model + '. Please share availability and price.')}">Buy / Enquire on WhatsApp</a>
      <a class="btn btn-outline" href="tel:8887961171">Call Now</a>
    </div>
    <p style="margin-top:16px; font-size:.82rem;">Ask About This Product — our team will confirm exact specifications and current stock for this unit.</p>
  `;
  modal.classList.add('open');
}
function closeProduct(){ modal.classList.remove('open'); }

/* ---------- Enquiry form -> WhatsApp handoff ---------- */
const form = document.getElementById('enquiry-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const lines = [
    'Hello Uttam IT Support, I would like to submit an enquiry:',
    `Name: ${d.get('name')}`,
    `Mobile: ${d.get('mobile')}`,
    d.get('email') ? `Email: ${d.get('email')}` : null,
    `Service Required: ${d.get('service')}`,
    d.get('device_type') ? `Device Type: ${d.get('device_type')}` : null,
    d.get('brand_model') ? `Brand/Model: ${d.get('brand_model')}` : null,
    d.get('problem') ? `Problem: ${d.get('problem')}` : null,
    `Preferred Contact: ${d.get('contact_method')}`,
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/918887961171?text=${encodeURIComponent(lines)}`, '_blank');
});
