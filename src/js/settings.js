import { db } from './db.js';
import { toast, generateReceiptHTML, compressImage } from './utils.js';

class PrinterSettingsManager {
  constructor() {
    this.shopSettings = {};
    this.printerSettings = {
      paperSize: '58mm',
      showLogo: true,
      showQr: true,
      qrText: '',
      autoPrint: false
    };
  }

  async init() {
    this.cacheDOM();
    this.bindEvents();
    await this.loadSettings();
  }

  cacheDOM() {
    this.dom = {
      // Printer settings
      printForm: document.getElementById('printer-settings-form'),
      paperSize: document.getElementById('printer-paper-size'),
      headerToggle: document.getElementById('print-header-toggle'),
      logoToggle: document.getElementById('print-logo-toggle'),
      logoPosition: document.getElementById('print-logo-position'),
      gstToggle: document.getElementById('print-gst-toggle'),
      qrToggle: document.getElementById('print-qr-toggle'),
      footerToggle: document.getElementById('print-footer-toggle'),
      qrText: document.getElementById('print-qr-text'),
      autoPrintToggle: document.getElementById('print-autoprint-toggle'),
      receiptPreview: document.getElementById('thermal-receipt-preview-box'),
      testPrintBtn: document.getElementById('printer-test-print-btn'),
      
      // Store settings
      storeForm: document.getElementById('store-settings-form'),
      shopName: document.getElementById('shop-name'),
      ownerName: document.getElementById('owner-name'),
      phone: document.getElementById('shop-phone'),
      email: document.getElementById('shop-email'),
      address: document.getElementById('shop-address'),
      gst: document.getElementById('shop-gst'),
      currency: document.getElementById('shop-currency'),
      tax: document.getElementById('shop-tax'),
      serviceCharge: document.getElementById('shop-service-charge'),
      upiId: document.getElementById('shop-upi-id'),
      shopLogoFile: document.getElementById('shop-logo-file'),
      shopLogoPreview: document.getElementById('shop-logo-preview'),
      receiptHeader: document.getElementById('receipt-header-txt'),
      receiptFooter: document.getElementById('receipt-footer-txt'),
      
      // Database Backup
      backupBtn: document.getElementById('db-export-btn'),
      importFileInput: document.getElementById('db-import-file'),
      importFileName: document.getElementById('import-filename'),
      restoreBtn: document.getElementById('db-import-btn'),
      
      // Firebase settings
      firebaseForm: document.getElementById('firebase-config-form'),
      fbApiKey: document.getElementById('fb-api-key'),
      fbProjId: document.getElementById('fb-proj-id'),
      fbAuthDomain: document.getElementById('fb-auth-domain'),
      fbStorageBucket: document.getElementById('fb-storage-bucket')
    };
  }

  bindEvents() {
    // Printer settings save
    this.dom.printForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePrinterSettings();
    });

    // Store settings save
    this.dom.storeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveStoreSettings();
    });

    // Shop logo image upload file listener
    if (this.dom.shopLogoFile) {
      this.dom.shopLogoFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const base64 = await compressImage(file, 200, 200);
            this.dom.shopLogoPreview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
            this.dom.shopLogoPreview.dataset.base64 = base64;
            this.updateLivePreview();
          } catch (err) {
            toast.error("Failed to process logo image.", "Image Error");
          }
        }
      });
    }

    // Live preview refresh on print options change
    [this.dom.paperSize, this.dom.headerToggle, this.dom.logoToggle, this.dom.logoPosition, this.dom.gstToggle, this.dom.qrToggle, this.dom.footerToggle, this.dom.qrText].forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.updateLivePreview());
      }
    });
    if (this.dom.qrText) {
      this.dom.qrText.addEventListener('input', () => this.updateLivePreview());
    }

    // Generate test print
    this.dom.testPrintBtn.addEventListener('click', () => this.triggerTestPrint());

    // Backup download
    this.dom.backupBtn.addEventListener('click', () => {
      db.exportBackup();
      toast.success("Database JSON file downloaded.", "Backup Created");
    });

    // Restore File Upload
    this.dom.importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.dom.importFileName.innerText = file.name;
        this.dom.restoreBtn.removeAttribute('disabled');
      } else {
        this.dom.importFileName.innerText = 'No file selected';
        this.dom.restoreBtn.setAttribute('disabled', 'true');
      }
    });

    // Restore click
    this.dom.restoreBtn.addEventListener('click', async () => {
      const file = this.dom.importFileInput.files[0];
      if (!file) return;
      
      if (confirm("WARNING: Restoring database will overwrite all your current local data. Are you sure you want to proceed?")) {
        try {
          await db.importBackup(file);
          toast.success("All collections and settings restored.", "Restore Complete");
          // Re-load current panel values
          await this.loadSettings();
        } catch (err) {
          toast.error(err.message, "Database Restore Failed");
        }
      }
    });

    // Firebase Config Save
    this.dom.firebaseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveFirebaseConfig();
    });
  }

  async loadSettings() {
    // 1. Fetch from database manager
    this.shopSettings = (await db.get('settings')) || {};
    
    const savedPrinter = localStorage.getItem('pos_printer_settings');
    if (savedPrinter) {
      this.printerSettings = JSON.parse(savedPrinter);
    } else {
      this.printerSettings.qrText = this.shopSettings.qrCodeText || 'https://resotkitchen.com/pay';
      localStorage.setItem('pos_printer_settings', JSON.stringify(this.printerSettings));
    }

    // 2. Populate Printer Fields
    this.dom.paperSize.value = this.printerSettings.paperSize || '3inch';
    this.dom.headerToggle.checked = this.printerSettings.showHeader !== false;
    this.dom.logoToggle.checked = this.printerSettings.showLogo !== false;
    this.dom.logoPosition.value = this.printerSettings.logoPosition || 'center';
    this.dom.gstToggle.checked = this.printerSettings.showGst !== false;
    this.dom.qrToggle.checked = this.printerSettings.showQr !== false;
    this.dom.footerToggle.checked = this.printerSettings.showFooter !== false;
    this.dom.qrText.value = this.printerSettings.qrText || '';
    this.dom.autoPrintToggle.checked = this.printerSettings.autoPrint;

    // 3. Populate Store Fields
    this.dom.shopName.value = this.shopSettings.shopName || '';
    this.dom.ownerName.value = this.shopSettings.ownerName || '';
    this.dom.phone.value = this.shopSettings.phone || '';
    this.dom.email.value = this.shopSettings.email || '';
    this.dom.address.value = this.shopSettings.address || '';
    this.dom.gst.value = this.shopSettings.gstNumber || '';
    this.dom.currency.value = this.shopSettings.currency || '₹';
    this.dom.tax.value = this.shopSettings.taxPercentage !== undefined ? this.shopSettings.taxPercentage : 5;
    this.dom.serviceCharge.value = this.shopSettings.serviceChargePercentage !== undefined ? this.shopSettings.serviceChargePercentage : 2;
    this.dom.upiId.value = this.shopSettings.upiId || '';
    this.dom.receiptHeader.value = this.shopSettings.receiptHeader || '';
    this.dom.receiptFooter.value = this.shopSettings.receiptFooter || '';

    // Load and preview current Shop Logo
    if (this.shopSettings.logo) {
      this.dom.shopLogoPreview.innerHTML = `<img src="${this.shopSettings.logo}" style="width:100%; height:100%; object-fit:cover;">`;
      this.dom.shopLogoPreview.dataset.base64 = this.shopSettings.logo;
    } else {
      this.dom.shopLogoPreview.innerHTML = `<i class="material-icons" style="font-size:28px; color:var(--text-muted);">store</i>`;
      delete this.dom.shopLogoPreview.dataset.base64;
    }

    // 4. Populate Firebase Fields
    const fb = this.shopSettings.firebaseConfig;
    if (fb) {
      this.dom.fbApiKey.value = fb.apiKey || '';
      this.dom.fbProjId.value = fb.projectId || '';
      this.dom.fbAuthDomain.value = fb.authDomain || '';
      this.dom.fbStorageBucket.value = fb.storageBucket || '';
    }

    // 5. Update receipt rendering
    this.updateLivePreview();
  }

  savePrinterSettings() {
    this.printerSettings = {
      paperSize: this.dom.paperSize.value,
      showHeader: this.dom.headerToggle.checked,
      showLogo: this.dom.logoToggle.checked,
      logoPosition: this.dom.logoPosition.value,
      showGst: this.dom.gstToggle.checked,
      showQr: this.dom.qrToggle.checked,
      showFooter: this.dom.footerToggle.checked,
      qrText: this.dom.qrText.value.trim(),
      autoPrint: this.dom.autoPrintToggle.checked
    };
    localStorage.setItem('pos_printer_settings', JSON.stringify(this.printerSettings));
    toast.success("Thermal receipt format saved.", "Settings Saved");
    this.updateLivePreview();
  }

  async saveStoreSettings() {
    const updated = {
      ...this.shopSettings,
      shopName: this.dom.shopName.value.trim(),
      ownerName: this.dom.ownerName.value.trim(),
      phone: this.dom.phone.value.trim(),
      email: this.dom.email.value.trim(),
      address: this.dom.address.value.trim(),
      gstNumber: this.dom.gst.value.trim(),
      currency: this.dom.currency.value.trim(),
      taxPercentage: parseFloat(this.dom.tax.value) || 0,
      serviceChargePercentage: parseFloat(this.dom.serviceCharge.value) || 0,
      upiId: this.dom.upiId.value.trim(),
      logo: this.dom.shopLogoPreview.dataset.base64 || '',
      receiptHeader: this.dom.receiptHeader.value,
      receiptFooter: this.dom.receiptFooter.value
    };

    try {
      await db.set('settings', updated);
      this.shopSettings = updated;
      
      // Update sidebar shop title
      document.getElementById('shop-sidebar-title').innerText = updated.shopName;
      
      toast.success("General store settings saved successfully.", "Settings Saved");
      this.updateLivePreview();
    } catch (err) {
      toast.error(err.message, "Failed to Save Shop Settings");
    }
  }

  async saveFirebaseConfig() {
    const apiKey = this.dom.fbApiKey.value.trim();
    const projectId = this.dom.fbProjId.value.trim();
    const authDomain = this.dom.fbAuthDomain.value.trim();
    const storageBucket = this.dom.fbStorageBucket.value.trim();

    if (!apiKey || !projectId) {
      toast.warning("API Key and Project ID are required.", "Keys Missing");
      return;
    }

    const config = {
      apiKey: apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: storageBucket || `${projectId}.appspot.com`
    };

    const updatedSettings = {
      ...this.shopSettings,
      firebaseConfig: config
    };

    try {
      await db.set('settings', updatedSettings);
      this.shopSettings = updatedSettings;
      
      // Re-initialize Database Firebase connection
      db.initFirebase();
      
      toast.success("Firebase Credentials saved. Attempting database synchronization...", "Cloud Sync Initialized");
    } catch (err) {
      toast.error(err.message, "Sync Setup Failed");
    }
  }

  updateLivePreview() {
    // Generate a mockup order object
    const mockOrder = {
      id: 'ORD-XXXXXX',
      tokenNumber: 42,
      tableNumber: '5',
      customerName: 'Aria Stark',
      date: new Date().toISOString().split('T')[0],
      time: '14:25',
      items: [
        { name: 'Masala Chai', qty: 2, price: 20 },
        { name: 'Burger + Fries Combo', qty: 1, price: 199 }
      ],
      subtotal: 239,
      discount: 20,
      tax: 10.95,
      serviceCharge: 4.38,
      grandTotal: 234.33,
      paymentMethod: 'UPI'
    };

    const html = generateReceiptHTML(mockOrder, this.shopSettings, this.printerSettings);
    
    // Dynamically toggle width class for preview representability
    const sizeClass = (this.printerSettings.paperSize === '58mm' || this.printerSettings.paperSize === '3inch') ? 'paper-3inch' : 'paper-4inch';
    this.dom.receiptPreview.className = '';
    this.dom.receiptPreview.classList.add(sizeClass);
    
    this.dom.receiptPreview.innerHTML = html;
  }

  triggerTestPrint() {
    const mockOrder = {
      id: 'TEST-9999',
      tokenNumber: 99,
      tableNumber: 'Test',
      customerName: 'Test Customer',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      items: [
        { name: 'Sample Beverage', qty: 1, price: 50 },
        { name: 'Popular Snack', qty: 2, price: 75 }
      ],
      subtotal: 200,
      discount: 10,
      tax: 9.5,
      serviceCharge: 3.8,
      grandTotal: 203.3,
      paymentMethod: 'Cash'
    };

    const printArea = document.getElementById('receipt-print-area');
    if (printArea) {
      printArea.innerHTML = generateReceiptHTML(mockOrder, this.shopSettings, this.printerSettings);
      setTimeout(() => {
        window.print();
      }, 100);
    }
  }
}

export const printerSettings = new PrinterSettingsManager();
export { PrinterSettingsManager };
