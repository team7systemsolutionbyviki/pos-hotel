// 1. Toast Notifications Manager
export const toast = {
  show(title, message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    
    // Choose icon based on toast type
    let iconName = 'info';
    if (type === 'success') iconName = 'check_circle';
    if (type === 'error') iconName = 'error';
    if (type === 'warning') iconName = 'warning';

    toastEl.innerHTML = `
      <div class="toast-icon">
        <i class="material-icons">${iconName}</i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toastEl);

    // Auto-remove toast after duration
    setTimeout(() => {
      toastEl.classList.add('toast-out');
      toastEl.addEventListener('animationend', () => {
        toastEl.remove();
      });
    }, duration);
  },
  
  success(message, title = 'Success') { this.show(title, message, 'success'); },
  error(message, title = 'Error') { this.show(title, message, 'error'); },
  warning(message, title = 'Warning') { this.show(title, message, 'warning'); },
  info(message, title = 'Info') { this.show(title, message, 'info'); }
};

// 2. Ripple Button Effect Initializer
export function initRipples() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn');
    if (!target) return;
    
    const circle = document.createElement('span');
    circle.classList.add('ripple');
    
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    circle.style.width = circle.style.height = `${size}px`;
    
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    
    // Clear old ripples
    const oldRipple = target.querySelector('.ripple');
    if (oldRipple) oldRipple.remove();
    
    target.appendChild(circle);
  });
}

// 3. Keyboard Shortcut Binder
export function bindKeyboardShortcuts(actions) {
  window.addEventListener('keydown', (e) => {
    // ESC - Close Modals
    if (e.key === 'Escape') {
      const activeOverlay = document.querySelector('.modal-overlay.active');
      if (activeOverlay) {
        activeOverlay.classList.remove('active');
        e.preventDefault();
      }
    }
    
    // Only capture F-keys if the POS Billing view is active or if globally allowed
    const posScreenActive = document.getElementById('pos-screen').classList.contains('active');
    if (!posScreenActive) return;

    if (e.key === 'F1') {
      if (actions.onSearchFocus) {
        actions.onSearchFocus();
        e.preventDefault();
      }
    }
    if (e.key === 'F2') {
      if (actions.onCheckoutTrigger) {
        actions.onCheckoutTrigger();
        e.preventDefault();
      }
    }
    if (e.key === 'F3') {
      if (actions.onHoldTrigger) {
        actions.onHoldTrigger();
        e.preventDefault();
      }
    }
    if (e.key === 'F4') {
      if (actions.onNewBillTrigger) {
        actions.onNewBillTrigger();
        e.preventDefault();
      }
    }
    if (e.key === 'F5') {
      if (actions.onRefreshTrigger) {
        actions.onRefreshTrigger();
        e.preventDefault(); // Intercept browser refresh
      }
    }
  });
}

// 4. Barcode Scanner Reader Input Buffer
export function initBarcodeScanner(onBarcodeRead) {
  let buffer = '';
  let lastKeyTime = Date.now();

  window.addEventListener('keypress', (e) => {
    // Standard barcode scanner triggers keystrokes quickly (typically < 30ms interval)
    const currentTime = Date.now();
    const diff = currentTime - lastKeyTime;
    lastKeyTime = currentTime;

    // Check if user is typing in form inputs (should skip scanner buffer in forms)
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl.id !== 'pos-product-search-input') {
      return;
    }

    if (e.key === 'Enter') {
      if (buffer.length > 2) {
        onBarcodeRead(buffer);
        buffer = '';
      }
    } else {
      // If keystrokes are slow, reset buffer assuming it is manual typing (threshold 50ms)
      if (diff > 50) {
        buffer = '';
      }
      // Add digits/characters
      if (e.key.match(/[a-zA-Z0-9-]/)) {
        buffer += e.key;
      }
    }
  });
}

// 5. Thermal Receipt formatter and printer
export function generateReceiptHTML(orderData, shopSettings, printerSettings) {
  const currency = shopSettings.currency || '₹';
  const paperSize = printerSettings.paperSize || '3inch';
  const normalizedPaperSize = (paperSize === '58mm' || paperSize === '3inch') ? '3inch' : '4inch';

  // Extract toggles with defaults
  const showHeader = printerSettings.showHeader !== false;
  const showLogo = printerSettings.showLogo !== false;
  const logoPosition = printerSettings.logoPosition || 'center';
  const showGst = printerSettings.showGst !== false;
  const showQr = printerSettings.showQr !== false;
  const showFooter = printerSettings.showFooter !== false;

  // Alignments
  const logoTextAlign = logoPosition;
  
  // Format items rows
  let itemsHTML = '';
  orderData.items.forEach(item => {
    const totalItemPrice = (item.price * item.qty).toFixed(2);
    itemsHTML += `
<div class="print-row">
  <span>${item.name} x${item.qty}</span>
  <span>${currency}${totalItemPrice}</span>
</div>`;
    if (item.notes) {
      itemsHTML += `<div style="font-size: 9px; padding-left: 10px; font-style: italic;">* Note: ${item.notes}</div>`;
    }
  });

  const headerText = (shopSettings.receiptHeader || '').replace(/\n/g, '<br>');
  const footerText = (shopSettings.receiptFooter || '').replace(/\n/g, '<br>');

  // QR URL construction
  let qrUrl = printerSettings.qrText || '';
  if (shopSettings.upiId) {
    // Generate dynamic UPI deep link
    qrUrl = `upi://pay?pa=${shopSettings.upiId}&pn=${encodeURIComponent(shopSettings.shopName || '')}&am=${orderData.grandTotal.toFixed(2)}&cu=INR&tn=${orderData.id}`;
  }

  return `
    <div class="receipt-container paper-${normalizedPaperSize}" style="padding: 10px; background: #fff; color: #000; font-family: 'Courier New', Courier, monospace;">
      
      ${showHeader ? `
        <div class="print-header" style="text-align: ${logoTextAlign};">
          ${showLogo && shopSettings.logo ? `<div style="display:flex; justify-content:${logoTextAlign === 'left' ? 'flex-start' : (logoTextAlign === 'right' ? 'flex-end' : 'center')}; margin-bottom: 5px;"><img src="${shopSettings.logo}" style="max-width: 60px; filter: grayscale(100%);"></div>` : ''}
          <h2 style="margin: 0; font-size: 16px;">${shopSettings.shopName || 'Resot Kitchen'}</h2>
          <div style="font-size: 10px; margin-top: 4px; text-align: ${logoTextAlign};">
            ${headerText}<br>
            Ph: ${shopSettings.phone || ''}<br>
            ${showGst && shopSettings.gstNumber ? `GSTIN: ${shopSettings.gstNumber}` : ''}
          </div>
        </div>
        <div class="print-divider" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      ` : `
        ${showLogo && shopSettings.logo ? `
          <div style="display:flex; justify-content:${logoTextAlign === 'left' ? 'flex-start' : (logoTextAlign === 'right' ? 'flex-end' : 'center')}; margin-bottom: 5px;"><img src="${shopSettings.logo}" style="max-width: 60px; filter: grayscale(100%);"></div>
          <div class="print-divider" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
        ` : ''}
      `}

      <div style="font-size: 10px; margin-bottom: 8px;">
        <div class="print-row"><span>Bill No: ${orderData.id}</span> <span>Token: ${orderData.tokenNumber}</span></div>
        <div class="print-row"><span>Date: ${orderData.date} ${orderData.time || ''}</span> <span>Table: ${orderData.tableNumber || 'Takeaway'}</span></div>
        ${orderData.customerName ? `<div>Customer: ${orderData.customerName}</div>` : ''}
      </div>
      <div class="print-divider" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      
      <div class="print-items" style="font-size: 11px;">
        ${itemsHTML}
      </div>
      <div class="print-divider" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      
      <div style="font-size: 10px;">
        <div class="print-row"><span>Subtotal:</span> <span>${currency}${orderData.subtotal.toFixed(2)}</span></div>
        ${orderData.discount > 0 ? `<div class="print-row"><span>Discount:</span> <span>-${currency}${orderData.discount.toFixed(2)}</span></div>` : ''}
        ${showGst && orderData.tax > 0 ? `<div class="print-row"><span>GST Tax:</span> <span>${currency}${orderData.tax.toFixed(2)}</span></div>` : ''}
        ${orderData.serviceCharge > 0 ? `<div class="print-row"><span>Service:</span> <span>${currency}${orderData.serviceCharge.toFixed(2)}</span></div>` : ''}
        <div class="print-divider" style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>
        <div class="print-row" style="font-size: 13px; font-weight: bold;">
          <span>GRAND TOTAL:</span>
          <span>${currency}${orderData.grandTotal.toFixed(2)}</span>
        </div>
        <div class="print-row" style="font-size: 10px; margin-top: 4px;">
          <span>Paid Via:</span>
          <span>${orderData.paymentMethod}</span>
        </div>
      </div>
      <div class="print-divider" style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
      
      <div class="print-footer" style="font-size: 9px; text-align: center;">
        ${showFooter ? `${footerText}` : ''}
        ${showQr && qrUrl ? `
          <div class="print-qr" style="margin-top: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="font-size: 8px; margin-bottom: 4px;">
              ${shopSettings.upiId ? 'Scan QR with GPay/PhonePe to Pay' : 'Scan to Pay / Feedback'}
            </div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qrUrl)}" style="width: 100px; height: 100px; margin: 0 auto;">
          </div>
        ` : ''}
      </div>
    </div>`;
}

// Print trigger utility
export function printReceipt(orderData, shopSettings, printerSettings) {
  const html = generateReceiptHTML(orderData, shopSettings, printerSettings);
  const printArea = document.getElementById('receipt-print-area');
  
  if (printArea) {
    printArea.innerHTML = html;
    
    // Auto print if enabled or if direct print triggered
    setTimeout(() => {
      window.print();
    }, 100);
  }
}

// 6. Client-side Image Compression Helper (Prevents LocalStorage QuotaExceeded errors)
export function compressImage(file, maxWidth = 250, maxHeight = 250) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG at 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

class PrintQueueManager {
  constructor() {
    this.queue = [];
    this.isPrinting = false;
    
    if (typeof window !== 'undefined') {
      window.addEventListener('afterprint', () => {
        this.isPrinting = false;
        // Give the browser a split second to settle before spawning the next dialog
        setTimeout(() => {
          this.processNext();
        }, 300);
      });
    }
  }
  
  add(html) {
    this.queue.push(html);
    this.processNext();
  }
  
  processNext() {
    if (this.isPrinting || this.queue.length === 0) return;
    
    this.isPrinting = true;
    const html = this.queue.shift();
    
    const printArea = document.getElementById('receipt-print-area');
    if (printArea) {
      printArea.innerHTML = html;
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      this.isPrinting = false;
    }
  }
}

export const printQueue = new PrintQueueManager();
