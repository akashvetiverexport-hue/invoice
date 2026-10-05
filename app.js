const STORAGE_KEY = 'akash-vettiver-invoice-draft-v1';
const COUNTER_KEY = 'akash-vettiver-invoice-counter-v1';
const MAX_ITEMS = 20;
const DEFAULT_ITEMS = 3;

const elements = {
  invoiceNumber: document.querySelector('#invoiceNumber'),
  invoiceDate: document.querySelector('#invoiceDate'),
  customerName: document.querySelector('#customerName'),
  customerEmail: document.querySelector('#customerEmail'),
  customerAddress: document.querySelector('#customerAddress'),
  currency: document.querySelector('#currency'),
  advanceAmount: document.querySelector('#advanceAmount'),
  invoiceNotes: document.querySelector('#invoiceNotes'),
  itemList: document.querySelector('#itemList'),
  saveStatus: document.querySelector('#saveStatus'),
};

const today = new Date();
const todayString = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
let saveTimer;
let state = loadDraft() || {
  invoiceNo: createInvoiceNumber(),
  date: todayString,
  customer: '',
  email: '',
  address: '',
  currency: 'INR',
  advanceAmount: '',
  notes: '',
  items: Array.from({ length: DEFAULT_ITEMS }, () => makeItem()),
};

function makeItem(item = {}) {
  return {
    name: typeof item.name === 'string' ? item.name : '',
    quantity: item.quantity === undefined ? '1' : String(item.quantity),
    price: item.price === undefined ? '' : String(item.price),
  };
}

function createInvoiceNumber() {
  const year = new Date().getFullYear();
  let counters = {};
  try {
    counters = JSON.parse(localStorage.getItem(COUNTER_KEY) || '{}');
  } catch {
    counters = {};
  }
  const next = (Number(counters[year]) || 0) + 1;
  counters[year] = next;
  try {
    localStorage.setItem(COUNTER_KEY, JSON.stringify(counters));
  } catch {
    // The invoice still works if browser storage is unavailable.
  }
  return `AV-${year}-${String(next).padStart(4, '0')}`;
}

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return null;
    const items = Array.isArray(saved.items) ? saved.items.slice(0, MAX_ITEMS).map(makeItem) : [];
    return {
      invoiceNo: typeof saved.invoiceNo === 'string' ? saved.invoiceNo : createInvoiceNumber(),
      date: typeof saved.date === 'string' ? saved.date : todayString,
      customer: typeof saved.customer === 'string' ? saved.customer : '',
      email: typeof saved.email === 'string' ? saved.email : '',
      address: typeof saved.address === 'string' ? saved.address : '',
      currency: ['INR', 'USD', 'EUR', 'GBP', 'AED'].includes(saved.currency) ? saved.currency : 'INR',
      advanceAmount: saved.advanceAmount === undefined ? '' : String(saved.advanceAmount),
      notes: typeof saved.notes === 'string' ? saved.notes : '',
      items: items.length ? items : Array.from({ length: DEFAULT_ITEMS }, () => makeItem()),
    };
  } catch {
    return null;
  }
}

function formatMoney(value) {
  const amount = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: state.currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${state.currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function renderItems() {
  elements.itemList.innerHTML = state.items.map((item, index) => `
    <div class="item-card" data-index="${index}">
      <div class="item-card-top"><span class="item-card-label">Product ${String(index + 1).padStart(2, '0')}</span><button class="remove-item" type="button" aria-label="Remove product ${index + 1}" title="Remove product">×</button></div>
      <div class="item-fields">
        <label class="field compact"><span>Product name</span><input data-field="name" type="text" value="${escapeAttribute(item.name)}" placeholder="Product name" aria-label="Product ${index + 1} name" /></label>
        <label class="field compact"><span>Quantity</span><input data-field="quantity" class="numeric-input" type="number" min="0" step="1" value="${escapeAttribute(item.quantity)}" aria-label="Product ${index + 1} quantity" /></label>
        <label class="field compact"><span>Unit price</span><input data-field="price" class="numeric-input" type="number" min="0" step="0.01" value="${escapeAttribute(item.price)}" placeholder="0.00" aria-label="Product ${index + 1} unit price" /></label>
      </div>
    </div>`).join('');
  document.querySelector('#addItemButton').disabled = state.items.length >= MAX_ITEMS;
}

function renderPreview() {
  document.querySelector('#previewNumber').textContent = state.invoiceNo || '—';
  document.querySelector('#footerInvoiceNumber').textContent = state.invoiceNo || '—';
  document.querySelector('#previewDate').textContent = formatDate(state.date);
  document.querySelector('#previewCustomer').textContent = state.customer.trim() || 'Customer name';
  const email = document.querySelector('#previewEmail');
  email.textContent = state.email.trim();
  email.hidden = !state.email.trim();
  const address = document.querySelector('#previewAddress');
  address.textContent = state.address.trim();
  address.hidden = !state.address.trim();
  const validItems = state.items.map(item => ({
    name: item.name.trim(),
    quantity: Math.max(0, Number(item.quantity) || 0),
    price: Math.max(0, Number(item.price) || 0),
  })).filter(item => item.name || item.price > 0);
  const previewItems = document.querySelector('#previewItems');
  if (!validItems.length) {
    previewItems.innerHTML = '<tr><td colspan="4" class="empty-items">Your products will appear here</td></tr>';
  } else {
    previewItems.innerHTML = validItems.map(item => `
      <tr>
        <td>${escapeHtml(item.name || 'Product')}</td>
        <td class="number-cell">${item.quantity}</td>
        <td class="number-cell">${formatMoney(item.price)}<span class="unit-subtext">per item</span></td>
        <td class="number-cell">${formatMoney(item.price * item.quantity)}</td>
      </tr>`).join('');
  }
  const subtotal = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const advancePaid = Math.max(0, Number(state.advanceAmount) || 0);
  const balanceDue = Math.max(0, subtotal - advancePaid);
  const creditBalance = Math.max(0, advancePaid - subtotal);
  document.querySelector('#previewSubtotal').textContent = formatMoney(subtotal);
  const advanceRow = document.querySelector('#advanceRow');
  advanceRow.hidden = advancePaid <= 0;
  document.querySelector('#previewAdvance').textContent = `−${formatMoney(advancePaid)}`;
  const creditRow = document.querySelector('#creditRow');
  creditRow.hidden = creditBalance <= 0;
  document.querySelector('#previewCredit').textContent = formatMoney(creditBalance);
  document.querySelector('#previewBalance').textContent = formatMoney(balanceDue);
  document.querySelector('#previewNotes').textContent = state.notes.trim();
}

function populateForm() {
  elements.invoiceNumber.value = state.invoiceNo;
  elements.invoiceDate.value = state.date;
  elements.customerName.value = state.customer;
  elements.customerEmail.value = state.email;
  elements.customerAddress.value = state.address;
  elements.currency.value = state.currency;
  elements.advanceAmount.value = state.advanceAmount;
  elements.invoiceNotes.value = state.notes;
  renderItems();
  renderPreview();
}

function saveDraft() {
  window.clearTimeout(saveTimer);
  elements.saveStatus.innerHTML = '<span class="status-dot"></span>Saving…';
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      elements.saveStatus.innerHTML = '<span class="status-dot"></span>Saved on this device';
    } catch {
      elements.saveStatus.innerHTML = '<span class="status-dot"></span>Storage unavailable';
    }
  }, 250);
}

function updateAndSave() {
  renderPreview();
  saveDraft();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

const fieldBindings = [
  [elements.invoiceNumber, 'invoiceNo'],
  [elements.invoiceDate, 'date'],
  [elements.customerName, 'customer'],
  [elements.customerEmail, 'email'],
  [elements.customerAddress, 'address'],
  [elements.currency, 'currency'],
  [elements.advanceAmount, 'advanceAmount'],
  [elements.invoiceNotes, 'notes'],
];

fieldBindings.forEach(([element, key]) => {
  element.addEventListener('input', () => {
    state[key] = element.value;
    updateAndSave();
  });
  element.addEventListener('change', () => {
    state[key] = element.value;
    updateAndSave();
  });
});

elements.itemList.addEventListener('input', event => {
  const card = event.target.closest('.item-card');
  const field = event.target.dataset.field;
  if (!card || !field) return;
  state.items[Number(card.dataset.index)][field] = event.target.value;
  updateAndSave();
});

elements.itemList.addEventListener('click', event => {
  const removeButton = event.target.closest('.remove-item');
  if (!removeButton) return;
  const card = removeButton.closest('.item-card');
  state.items.splice(Number(card.dataset.index), 1);
  renderItems();
  updateAndSave();
});

document.querySelector('#addItemButton').addEventListener('click', () => {
  if (state.items.length >= MAX_ITEMS) return;
  state.items.push(makeItem());
  renderItems();
  updateAndSave();
  elements.itemList.lastElementChild?.querySelector('[data-field="name"]')?.focus();
});

document.querySelector('#newInvoiceButton').addEventListener('click', () => {
  const hasContent = state.customer.trim() || Number(state.advanceAmount) > 0 || state.items.some(item => item.name.trim() || item.price.trim());
  if (hasContent && !window.confirm('Start a new invoice? The current invoice will be replaced on this device.')) return;
  state = {
    invoiceNo: createInvoiceNumber(),
    date: todayString,
    customer: '',
    email: '',
    address: '',
    currency: 'INR',
    advanceAmount: '',
    notes: '',
    items: Array.from({ length: DEFAULT_ITEMS }, () => makeItem()),
  };
  populateForm();
  saveDraft();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('#printButton').addEventListener('click', () => window.print());

populateForm();
