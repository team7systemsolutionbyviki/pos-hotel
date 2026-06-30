import { db } from './db.js';
import { toast, bindKeyboardShortcuts, initBarcodeScanner, printReceipt, generateReceiptHTML, printQueue } from './utils.js';

class POSSystem {
  constructor() {
    this.cart = [];
    this.categories = [];
    this.products = [];
    this.selectedCategory = 'All';
    this.searchQuery = '';
    
    // Payment status state
    this.grandTotal = 0;
    this.cashReceived = 0;
    this.heldBills = JSON.parse(localStorage.getItem('pos_held_bills')) || [];
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.setupShortcuts();
    this.setupBarcodeScanner();
    this.refreshCatalog().then(() => {
      this.clearCart();
    });
    // Update live KOT tracking bar every 5 seconds
    setInterval(() => {
      this.updateKOTStatusList();
    }, 5000);
  }

  cacheDOM() {
    this.dom = {
      search: document.getElementById('pos-product-search-input'),
      categoriesBar: document.getElementById('pos-categories-bar'),
      productsGrid: document.getElementById('pos-products-grid'),
      cartList: document.getElementById('pos-cart-items-list'),
      custName: document.getElementById('cart-cust-name'),
      tokenNum: document.getElementById('cart-token-number'),
      tableNum: document.getElementById('cart-table-number'),
      discountInput: document.getElementById('cart-discount-input'),
      taxCheckbox: document.getElementById('tax-toggle-checkbox'),
      serviceCheckbox: document.getElementById('service-toggle-checkbox'),
      taxPercentLbl: document.getElementById('tax-percent-lbl'),
      servicePercentLbl: document.getElementById('service-percent-lbl'),
      subtotal: document.getElementById('summary-subtotal'),
      discount: document.getElementById('summary-discount'),
      tax: document.getElementById('summary-tax'),
      serviceCharge: document.getElementById('summary-service'),
      grandTotal: document.getElementById('summary-grandtotal'),
      clearBtn: document.getElementById('pos-clear-cart-btn'),
      holdBtn: document.getElementById('pos-hold-btn'),
      resumeBtn: document.getElementById('pos-resume-list-btn'),
      checkoutBtn: document.getElementById('pos-checkout-btn'),
      checkoutModal: document.getElementById('checkout-modal'),
      checkoutGrandTotal: document.getElementById('checkout-modal-grandtotal'),
      checkoutPayMethod: document.getElementById('checkout-pay-method'),
      checkoutCashReceived: document.getElementById('checkout-cash-received'),
      checkoutCashBalance: document.getElementById('checkout-cash-balance'),
      checkoutCashSection: document.getElementById('checkout-cash-section'),
      checkoutSplitSection: document.getElementById('checkout-split-section'),
      checkoutSplitCash: document.getElementById('checkout-split-cash'),
      checkoutSplitUpi: document.getElementById('checkout-split-upi'),
      checkoutSplitCard: document.getElementById('checkout-split-card'),
      checkoutSplitSum: document.getElementById('checkout-split-sum'),
      numpad: document.getElementById('checkout-numpad'),
      quickCashGrid: document.getElementById('checkout-quick-cash-amounts'),
      checkoutConfirmBtn: document.getElementById('checkout-modal-confirm-btn'),
      holdModal: document.getElementById('hold-list-modal'),
      holdModalBody: document.getElementById('hold-list-modal-body'),
      receiptModal: document.getElementById('receipt-preview-modal'),
      receiptModalViewer: document.getElementById('receipt-modal-viewer-box'),
      receiptModalPrintBtn: document.getElementById('receipt-modal-print-btn')
    };
  }

  bindEvents() {
    // Search input typing
    this.dom.search.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderProducts();
    });

    // Discount changes
    this.dom.discountInput.addEventListener('input', () => this.calculateTotals());
    
    // Tax and service check togglers
    this.dom.taxCheckbox.addEventListener('change', () => this.calculateTotals());
    this.dom.serviceCheckbox.addEventListener('change', () => this.calculateTotals());

    // Clear cart click
    this.dom.clearBtn.addEventListener('click', () => {
      if (this.cart.length === 0) return;
      this.clearCart();
      toast.info("Cart cleared successfully.", "Cart Resetted");
    });

    // Hold current order click
    this.dom.holdBtn.addEventListener('click', () => this.holdBill());

    // Show held orders click
    this.dom.resumeBtn.addEventListener('click', () => this.showHeldBills());

    // Checkout Proceed payment trigger
    this.dom.checkoutBtn.addEventListener('click', () => this.openCheckout());

    // Confirm Payment
    this.dom.checkoutConfirmBtn.addEventListener('click', () => this.confirmPayment());

    // Listen on pay mode selector to hide/show cash inputs vs split options
    this.dom.checkoutPayMethod.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode === 'Split') {
        this.dom.checkoutCashSection.style.display = 'none';
        this.dom.checkoutSplitSection.style.display = 'flex';
        this.calculateSplitSum();
      } else if (mode === 'Cash') {
        this.dom.checkoutCashSection.style.display = 'block';
        this.dom.checkoutSplitSection.style.display = 'none';
        this.calculateCashChange();
      } else {
        // Card or UPI
        this.dom.checkoutCashSection.style.display = 'none';
        this.dom.checkoutSplitSection.style.display = 'none';
      }
    });

    // Split input listeners
    [this.dom.checkoutSplitCash, this.dom.checkoutSplitUpi, this.dom.checkoutSplitCard].forEach(input => {
      input.addEventListener('input', () => this.calculateSplitSum());
    });

    // Cash received inputs
    this.dom.checkoutCashReceived.addEventListener('input', () => this.calculateCashChange());

    // Keypad numbers trigger
    this.dom.numpad.addEventListener('click', (e) => {
      const numBtn = e.target.closest('.numpad-btn');
      if (!numBtn) return;
      
      const val = numBtn.getAttribute('data-val');
      const activeInput = document.activeElement;
      
      // Determine target field
      let targetInput = this.dom.checkoutCashReceived;
      if (this.dom.checkoutPayMethod.value === 'Split') {
        if (activeInput === this.dom.checkoutSplitCash || activeInput === this.dom.checkoutSplitUpi || activeInput === this.dom.checkoutSplitCard) {
          targetInput = activeInput;
        } else {
          targetInput = this.dom.checkoutSplitCash; // default
        }
      }

      let currentVal = targetInput.value;
      if (val === 'C') {
        targetInput.value = '';
      } else if (val === '.') {
        if (!currentVal.includes('.')) {
          targetInput.value = currentVal + '.';
        }
      } else {
        targetInput.value = currentVal + val;
      }
      
      // Trigger event to recalculate
      const event = new Event('input', { bubbles: true });
      targetInput.dispatchEvent(event);
    });

    // Quick cash amounts selection
    this.dom.quickCashGrid.addEventListener('click', (e) => {
      const amtBtn = e.target.closest('.btn');
      if (!amtBtn) return;
      const amt = parseFloat(amtBtn.getAttribute('data-amt'));
      this.dom.checkoutCashReceived.value = amt;
      
      const event = new Event('input', { bubbles: true });
      this.dom.checkoutCashReceived.dispatchEvent(event);
    });
  }

  setupShortcuts() {
    bindKeyboardShortcuts({
      onSearchFocus: () => this.dom.search.focus(),
      onCheckoutTrigger: () => {
        if (this.dom.checkoutModal.classList.contains('active')) {
          this.confirmPayment();
        } else {
          this.openCheckout();
        }
      },
      onHoldTrigger: () => this.holdBill(),
      onNewBillTrigger: () => this.clearCart(),
      onRefreshTrigger: () => {
        this.refreshCatalog();
        toast.success("Catalog and collections synced.", "Quick Refresh");
      }
    });
  }

  setupBarcodeScanner() {
    initBarcodeScanner((barcode) => {
      // Look up product by ID or custom barcode metadata.
      // We will match barcode with the product id or product name.
      const match = this.products.find(p => p.id === barcode || p.name.toLowerCase().includes(barcode.toLowerCase()));
      if (match) {
        if (match.status === 'outofstock') {
          toast.warning(`${match.name} is currently out of stock.`, "Inventory Alert");
        } else {
          this.addToCart(match);
          toast.success(`Scanned: ${match.name}`, "Item Scanned");
        }
      } else {
        toast.warning(`No product matches barcode: ${barcode}`, "Barcode Unknown");
      }
    });
  }

  async refreshCatalog() {
    this.categories = await db.get('categories');
    this.products = await db.get('products');
    
    // Read GST & Service from store settings
    const settings = (await db.get('settings')) || {};
    if (settings.taxPercentage !== undefined) {
      this.dom.taxPercentLbl.innerText = settings.taxPercentage;
    }
    if (settings.serviceChargePercentage !== undefined) {
      this.dom.servicePercentLbl.innerText = settings.serviceChargePercentage;
    }

    this.renderCategories();
    this.renderProducts();
    this.calculateTotals();
    this.updateKOTStatusList();
  }

  renderCategories() {
    this.dom.categoriesBar.innerHTML = `
      <div class="category-pill ${this.selectedCategory === 'All' ? 'active' : ''}" data-cat="All">
        <i class="material-icons">border_all</i> <span>All Items</span>
      </div>
    `;
    
    this.categories.forEach(cat => {
      if (cat.status !== 'active') return;
      this.dom.categoriesBar.innerHTML += `
        <div class="category-pill ${this.selectedCategory === cat.name ? 'active' : ''}" data-cat="${cat.name}">
          <span>${cat.name}</span>
        </div>
      `;
    });

    // Add click listeners
    this.dom.categoriesBar.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.selectedCategory = pill.getAttribute('data-cat');
        this.dom.categoriesBar.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.renderProducts();
      });
    });
  }

  renderProducts() {
    this.dom.productsGrid.innerHTML = '';
    
    const filtered = this.products.filter(p => {
      const matchCat = this.selectedCategory === 'All' || p.category === this.selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      this.dom.productsGrid.innerHTML = `
        <div style="grid-column: span 12; text-align:center; padding:40px; color:var(--text-secondary);">
          <i class="material-icons" style="font-size:48px;">search_off</i>
          <p style="margin-top:10px;">No products match the filters.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const isOutOfStock = p.status === 'outofstock';
      
      const card = document.createElement('div');
      card.className = `product-touch-card ${isOutOfStock ? 'out-of-stock-card' : ''}`;
      card.innerHTML = `
        <div class="product-card-img-wrapper">
          ${p.image ? `<img src="${p.image}" class="product-card-img" alt="${p.name}">` : `
            <div class="product-card-avatar-fallback">
              ${p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
          `}
        </div>
        <div class="product-card-info">
          <div class="product-card-name" title="${p.name}">${p.name}</div>
          <div class="product-card-price">₹${p.price.toFixed(2)}</div>
        </div>
        ${p.popular ? `<span class="product-card-tag tag-popular"><i class="material-icons" style="font-size:10px;">star</i> Pop</span>` : ''}
        ${isOutOfStock ? `<span class="product-card-tag tag-outofstock">OOS</span>` : ''}
      `;
      
      if (!isOutOfStock) {
        card.addEventListener('click', () => this.addToCart(p));
      }
      
      this.dom.productsGrid.appendChild(card);
    });
  }

  addToCart(product) {
    const existing = this.cart.find(item => item.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        costPrice: product.costPrice || (product.price * 0.4), // COGS fallback
        notes: ''
      });
    }
    this.renderCart();
    this.calculateTotals();
  }

  updateQuantity(id, delta) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    
    item.qty += delta;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(i => i.id !== id);
    }
    
    this.renderCart();
    this.calculateTotals();
  }

  updateItemNote(id, note) {
    const item = this.cart.find(i => i.id === id);
    if (item) {
      item.notes = note;
    }
  }

  renderCart() {
    this.dom.cartList.innerHTML = '';
    
    if (this.cart.length === 0) {
      this.dom.cartList.innerHTML = `
        <div style="text-align:center; padding:40px 10px; color:var(--text-secondary); margin:auto;">
          <i class="material-icons" style="font-size:36px; opacity:0.5;">shopping_cart</i>
          <p style="font-size:0.8rem; margin-top:8px;">Cart is empty.<br>Tap items to add.</p>
        </div>
      `;
      return;
    }

    this.cart.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <div class="cart-item-details">
          <div class="cart-item-name" title="${item.name}">${item.name}</div>
          <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
          <input type="text" class="cart-item-note" placeholder="Order requests (sugar, ice)..." value="${item.notes || ''}">
        </div>
        <div class="cart-item-qty-control">
          <button class="cart-item-qty-btn decrease-btn"><i class="material-icons">remove</i></button>
          <span class="cart-item-qty">${item.qty}</span>
          <button class="cart-item-qty-btn increase-btn"><i class="material-icons">add</i></button>
        </div>
      `;
      
      // Notes listener
      itemEl.querySelector('.cart-item-note').addEventListener('input', (e) => {
        this.updateItemNote(item.id, e.target.value);
      });
      
      // Adjust listener
      itemEl.querySelector('.decrease-btn').addEventListener('click', () => this.updateQuantity(item.id, -1));
      itemEl.querySelector('.increase-btn').addEventListener('click', () => this.updateQuantity(item.id, 1));
      
      this.dom.cartList.appendChild(itemEl);
    });
  }

  calculateTotals() {
    let subtotal = 0;
    this.cart.forEach(item => {
      subtotal += item.price * item.qty;
    });

    const discountVal = parseFloat(this.dom.discountInput.value) || 0;
    const isTaxEnabled = this.dom.taxCheckbox.checked;
    const isServiceEnabled = this.dom.serviceCheckbox.checked;
    
    const taxRate = isTaxEnabled ? (parseFloat(this.dom.taxPercentLbl.innerText) / 100) : 0;
    const serviceRate = isServiceEnabled ? (parseFloat(this.dom.servicePercentLbl.innerText) / 100) : 0;

    const baseAmount = Math.max(0, subtotal - discountVal);
    const tax = baseAmount * taxRate;
    const service = baseAmount * serviceRate;
    const grand = baseAmount + tax + service;

    this.grandTotal = grand;

    // Update DOM texts
    this.dom.subtotal.innerText = `₹${subtotal.toFixed(2)}`;
    this.dom.discount.innerText = `-₹${discountVal.toFixed(2)}`;
    this.dom.tax.innerText = `₹${tax.toFixed(2)}`;
    this.dom.serviceCharge.innerText = `₹${service.toFixed(2)}`;
    this.dom.grandTotal.innerText = `₹${grand.toFixed(2)}`;
  }

  async generateNextTokenNumber() {
    try {
      const orders = await db.get('orders');
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Filter orders placed today
      const todayOrders = orders.filter(o => o.date === todayStr);
      
      let maxToken = 0;
      todayOrders.forEach(o => {
        const tok = parseInt(o.tokenNumber);
        if (!isNaN(tok) && tok > maxToken) {
          maxToken = tok;
        }
      });
      
      // Also check active draft/held bills in localStorage to prevent duplicate tokens
      const drafts = JSON.parse(localStorage.getItem('pos_held_bills')) || [];
      drafts.forEach(o => {
        const tok = parseInt(o.tokenNumber);
        if (!isNaN(tok) && tok > maxToken) {
          maxToken = tok;
        }
      });

      return maxToken + 1;
    } catch (err) {
      console.warn("Failed to generate sequential token, using fallback:", err);
      return Math.floor(Math.random() * 100) + 1;
    }
  }

  async clearCart() {
    this.cart = [];
    this.dom.custName.value = '';
    this.dom.tableNum.value = '';
    this.dom.discountInput.value = '0';
    
    // Auto-generate next sequential token
    const nextToken = await this.generateNextTokenNumber();
    this.dom.tokenNum.value = nextToken;

    this.renderCart();
    this.calculateTotals();
  }

  // Hold Draft cart
  holdBill() {
    if (this.cart.length === 0) {
      toast.warning("Cannot hold an empty cart.", "Cart Empty");
      return;
    }

    const token = this.dom.tokenNum.value || Math.floor(Math.random() * 100) + 1;
    const cust = this.dom.custName.value.trim() || `Guest #${token}`;
    const table = this.dom.tableNum.value.trim();

    const heldOrder = {
      id: 'draft-' + Date.now(),
      tokenNumber: token,
      tableNumber: table,
      customerName: cust,
      items: [...this.cart],
      discount: parseFloat(this.dom.discountInput.value) || 0,
      taxEnabled: this.dom.taxCheckbox.checked,
      serviceEnabled: this.dom.serviceCheckbox.checked,
      date: new Date().toISOString().split('T')[0]
    };

    this.heldBills.push(heldOrder);
    localStorage.setItem('pos_held_bills', JSON.stringify(this.heldBills));
    
    toast.success(`Saved Bill Draft for Token ${token}`, "Bill Held");
    this.clearCart();
  }

  // Show held draft orders lists
  showHeldBills() {
    this.dom.holdModalBody.innerHTML = '';
    
    if (this.heldBills.length === 0) {
      this.dom.holdModalBody.innerHTML = `
        <p style="text-align:center; color:var(--text-secondary); padding:20px;">No bills are currently on hold.</p>
      `;
      this.dom.holdModal.classList.add('active');
      return;
    }

    this.heldBills.forEach(hb => {
      let itemsSummary = hb.items.map(i => `${i.name} x${i.qty}`).join(', ');
      if (itemsSummary.length > 50) itemsSummary = itemsSummary.substring(0, 48) + '...';

      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px; border-radius:var(--border-radius-md); border:1px solid var(--glass-border); margin-bottom:10px;';
      row.innerHTML = `
        <div style="flex:1; min-width:0; padding-right:12px;">
          <div style="font-weight:600; font-size:0.9rem;">Token #${hb.tokenNumber} - ${hb.customerName}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${itemsSummary}</div>
          ${hb.tableNumber ? `<span class="badge badge-info" style="margin-top:4px; font-size:0.65rem;">Table: ${hb.tableNumber}</span>` : ''}
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline btn-icon resume-bill-action" title="Resume"><i class="material-icons">play_arrow</i></button>
          <button class="btn btn-danger btn-icon delete-bill-action" title="Delete"><i class="material-icons">delete</i></button>
        </div>
      `;

      row.querySelector('.resume-bill-action').addEventListener('click', () => {
        this.resumeHeldBill(hb);
      });
      row.querySelector('.delete-bill-action').addEventListener('click', () => {
        this.deleteHeldBill(hb.id);
      });

      this.dom.holdModalBody.appendChild(row);
    });

    this.dom.holdModal.classList.add('active');
  }

  resumeHeldBill(hb) {
    this.cart = hb.items;
    this.dom.custName.value = hb.customerName.startsWith('Guest #') ? '' : hb.customerName;
    this.dom.tokenNum.value = hb.tokenNumber;
    this.dom.tableNum.value = hb.tableNumber || '';
    this.dom.discountInput.value = hb.discount;
    this.dom.taxCheckbox.checked = hb.taxEnabled;
    this.dom.serviceCheckbox.checked = hb.serviceEnabled;
    
    this.heldBills = this.heldBills.filter(b => b.id !== hb.id);
    localStorage.setItem('pos_held_bills', JSON.stringify(this.heldBills));
    
    this.renderCart();
    this.calculateTotals();
    this.dom.holdModal.classList.remove('active');
    toast.success(`Resumed order for Token ${hb.tokenNumber}`, "Order Restored");
  }

  deleteHeldBill(id) {
    this.heldBills = this.heldBills.filter(b => b.id !== id);
    localStorage.setItem('pos_held_bills', JSON.stringify(this.heldBills));
    this.showHeldBills(); // Redraw
    toast.info("Held order discarded.", "Draft Discarded");
  }

  // Open Checkout Pay details
  openCheckout() {
    if (this.cart.length === 0) {
      toast.warning("Your cart is empty. Add products first.", "Cart Empty");
      return;
    }
    
    this.dom.checkoutGrandTotal.innerText = `₹${this.grandTotal.toFixed(2)}`;
    
    // Setup inputs default values
    this.dom.checkoutCashReceived.value = '';
    this.dom.checkoutCashBalance.innerText = '₹0.00';
    this.dom.checkoutPayMethod.value = 'Cash';
    this.dom.checkoutCashSection.style.display = 'block';
    this.dom.checkoutSplitSection.style.display = 'none';

    // Generate Quick Cash received suggestions
    this.dom.quickCashGrid.innerHTML = '';
    const rounded = Math.ceil(this.grandTotal);
    // Suggest round values: next 10, next 50, next 100
    const suggestions = new Set([
      rounded,
      Math.ceil(rounded / 10) * 10,
      Math.ceil(rounded / 50) * 50,
      Math.ceil(rounded / 100) * 100,
      500,
      1000
    ]);
    // Filter suggestions smaller than the grand total
    Array.from(suggestions)
      .sort((a,b) => a-b)
      .filter(val => val >= rounded)
      .slice(0, 4)
      .forEach(val => {
        this.dom.quickCashGrid.innerHTML += `
          <button class="btn btn-outline" data-amt="${val}" style="padding:6px; font-size:0.85rem;">₹${val}</button>
        `;
      });

    this.dom.checkoutModal.classList.add('active');
    setTimeout(() => {
      this.dom.checkoutCashReceived.focus();
    }, 150);
  }

  calculateCashChange() {
    const cash = parseFloat(this.dom.checkoutCashReceived.value) || 0;
    const balance = Math.max(0, cash - this.grandTotal);
    this.dom.checkoutCashBalance.innerText = `₹${balance.toFixed(2)}`;
  }

  calculateSplitSum() {
    const cash = parseFloat(this.dom.checkoutSplitCash.value) || 0;
    const upi = parseFloat(this.dom.checkoutSplitUpi.value) || 0;
    const card = parseFloat(this.dom.checkoutSplitCard.value) || 0;
    const totalAllocated = cash + upi + card;
    
    this.dom.checkoutSplitSum.innerText = `₹${totalAllocated.toFixed(2)}`;
    if (Math.abs(totalAllocated - this.grandTotal) < 0.05) {
      this.dom.checkoutSplitSum.style.color = 'var(--success)';
    } else {
      this.dom.checkoutSplitSum.style.color = 'var(--danger)';
    }
  }

  async confirmPayment() {
    const mode = this.dom.checkoutPayMethod.value;
    
    // Validations
    if (mode === 'Cash') {
      const cash = parseFloat(this.dom.checkoutCashReceived.value) || 0;
      if (cash < this.grandTotal && this.grandTotal > 0) {
        toast.warning("Cash received is less than the Grand Total.", "Insufficient Cash");
        return;
      }
    } else if (mode === 'Split') {
      const cash = parseFloat(this.dom.checkoutSplitCash.value) || 0;
      const upi = parseFloat(this.dom.checkoutSplitUpi.value) || 0;
      const card = parseFloat(this.dom.checkoutSplitCard.value) || 0;
      const splitSum = cash + upi + card;
      if (Math.abs(splitSum - this.grandTotal) > 0.05) {
        toast.warning(`Allocated split amount (₹${splitSum.toFixed(2)}) must equal Grand Total (₹${this.grandTotal.toFixed(2)}).`, "Split Unbalanced");
        return;
      }
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const token = this.dom.tokenNum.value || Math.floor(Math.random() * 100) + 1;
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].slice(0, 5);
    
    let subtotal = 0;
    let costTotal = 0;
    this.cart.forEach(item => {
      subtotal += item.price * item.qty;
      costTotal += (item.costPrice || 0) * item.qty;
    });
    
    const discount = parseFloat(this.dom.discountInput.value) || 0;
    const taxVal = parseFloat(this.dom.tax.innerText.replace('₹', '')) || 0;
    const serviceVal = parseFloat(this.dom.serviceCharge.innerText.replace('₹', '')) || 0;

    const order = {
      id: orderId,
      tokenNumber: parseInt(token),
      tableNumber: this.dom.tableNum.value.trim(),
      customerName: this.dom.custName.value.trim(),
      items: [...this.cart],
      discount: discount,
      tax: taxVal,
      serviceCharge: serviceVal,
      subtotal: subtotal,
      grandTotal: this.grandTotal,
      costTotal: costTotal,
      paymentMethod: mode,
      date: date,
      time: time,
      status: 'completed'
    };

    // Close Payment Screen Modal
    this.dom.checkoutModal.classList.remove('active');
    
    try {
      // 1. Write order to Database
      await db.add('orders', order);
      
      // Print KOT and Guest Bill (Always in 3-inch fixed!)
      const settings = (await db.get('settings')) || {};
      const savedPrinter = JSON.parse(localStorage.getItem('pos_printer_settings')) || {};
      
      const guestBillPrintOpts = {
        showHeader: true,
        showLogo: true,
        logoPosition: 'center',
        showGst: true,
        showQr: true,
        showFooter: true,
        qrText: '',
        ...savedPrinter,
        paperSize: '3inch' // Hard force 3-inch fixed
      };

      // Compile KOT HTML
      const kotItemsHTML = order.items.map(i => `
        <div class="print-row" style="font-size:14px; font-weight:bold;">
          <span>${i.name}</span>
          <span>Qty: ${i.qty}</span>
        </div>
        ${i.notes ? `<div style="font-size:11px; padding-left:12px; margin-bottom:6px;">* ${i.notes}</div>` : ''}
      `).join('');

      const kotHTML = `
        <div class="receipt-container paper-3inch" style="padding:15px; color:#000; background:#fff; font-family:'Courier New', Courier, monospace; line-height:1.4; box-sizing:border-box;">
          <div style="text-align:center;">
            <h2 style="margin:0; font-size:22px;">KITCHEN ORDER (KOT)</h2>
            <h3 style="margin:4px 0 0 0; font-size:16px;">Token #${order.tokenNumber}</h3>
          </div>
          <div class="print-divider" style="border-bottom:1px dashed #000; margin:10px 0;"></div>
          <div style="font-size:12px;">
            <div>KOT ID: ${order.id}</div>
            <div>Time: ${order.date} ${order.time}</div>
            <div style="font-size:14px; font-weight:bold; margin-top:4px;">
              ${order.tableNumber ? `Table: ${order.tableNumber}` : 'Takeaway / Delivery'}
            </div>
          </div>
          <div class="print-divider" style="border-bottom:1px dashed #000; margin:10px 0;"></div>
          <div style="margin:10px 0;">
            ${kotItemsHTML}
          </div>
          <div class="print-divider" style="border-bottom:1px dashed #000; margin:10px 0;"></div>
          <div style="text-align:center; font-size:11px; font-style:italic;">
            Sent to Preparation
          </div>
        </div>
      `;

      // Compile Guest Bill HTML
      const billHTML = generateReceiptHTML(order, settings, guestBillPrintOpts);

      // Add both to the print queue sequentially (KOT print triggers first, followed by Guest Bill)
      printQueue.add(kotHTML);
      printQueue.add(billHTML);

      // Success visual animations (Lottie replacement using premium micro-toasts with animations)
      toast.success(`Order ${orderId} saved. Token #${token}`, "Checkout Successful");

      // Trigger reprint last receipt binding
      localStorage.setItem('pos_last_order', JSON.stringify(order));

      // 2. Clear state
      this.clearCart();
    } catch (err) {
      toast.error(err.message, "Transaction Failure");
    }
  }

  // Reprint last bill
  reprintLastBill() {
    const lastOrder = JSON.parse(localStorage.getItem('pos_last_order'));
    if (!lastOrder) {
      toast.warning("No recent orders found today.", "Reprint Error");
      return;
    }
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const printOpts = JSON.parse(localStorage.getItem('pos_printer_settings')) || { 
      paperSize: '3inch', 
      showHeader: true,
      showLogo: true, 
      logoPosition: 'center',
      showGst: true,
      showQr: true, 
      showFooter: true,
      qrText: '', 
      autoPrint: false 
    };
    
    printReceipt(lastOrder, settings, printOpts);
    toast.success(`Reprinting bill ${lastOrder.id}`, "Receipt Sent");
  }

  async updateKOTStatusList() {
    try {
      const kotBar = document.getElementById('pos-kot-status-bar');
      if (!kotBar) return;

      const orders = await db.get('orders');
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Filter today's active kitchen orders (preparing or ready)
      const activeKOTs = orders.filter(o => 
        o.date === todayStr && 
        (o.status === 'preparing' || o.status === 'ready')
      );

      const listContainer = kotBar.querySelector('.kot-status-list');
      if (!listContainer) return;

      if (activeKOTs.length === 0) {
        listContainer.innerHTML = `
          <div style="font-size:0.75rem; color:var(--text-muted); padding:4px 0;">
            No active kitchen orders at the moment.
          </div>
        `;
        return;
      }

      // Sort: Ready orders first so cashier notices them immediately!
      activeKOTs.sort((a, b) => {
        if (a.status === 'ready' && b.status !== 'ready') return -1;
        if (a.status !== 'ready' && b.status === 'ready') return 1;
        return b.time.localeCompare(a.time); // newest first
      });

      listContainer.innerHTML = activeKOTs.map(order => {
        const isReady = order.status === 'ready';
        const statusText = isReady ? 'Ready to Serve' : 'Preparing';
        const itemClass = isReady ? 'ready' : 'preparing';
        
        return `
          <div class="kot-status-item ${itemClass}">
            <div class="status-badge"></div>
            <div>
              <strong style="color:var(--text-primary);">Token #${order.tokenNumber}</strong>
              <span style="margin: 0 4px; color:var(--text-muted);">|</span>
              <span>${order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}</span>
              <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">
                Status: <strong>${statusText}</strong>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.warn("Failed to load KOT states:", err);
    }
  }
}

export const pos = new POSSystem();
export { printReceipt };
