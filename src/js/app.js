import { db } from './db.js';
import { auth } from './auth.js';
import { initRipples, toast } from './utils.js';

// Module Init Imports (will create these files next)
import { pos } from './pos.js';
import { kitchen } from './kitchen.js';
import { products } from './products.js';
import { expenses } from './expenses.js';
import { reports } from './reports.js';
import { printerSettings } from './settings.js';
import { users } from './users.js';

class ApplicationCoordinator {
  constructor() {
    this.activeScreen = 'dashboard';
    this.dom = {
      loginScreen: document.getElementById('login-screen'),
      loginForm: document.getElementById('login-form'),
      loginUsername: document.getElementById('login-username'),
      loginPassword: document.getElementById('login-password'),
      appShell: document.getElementById('app-shell'),
      sidebar: document.getElementById('sidebar'),
      menuItems: document.querySelectorAll('.menu-item'),
      logoutBtn: document.getElementById('sidebar-logout-btn'),
      mobileToggle: document.getElementById('mobile-sidebar-toggle'),
      screenHeading: document.getElementById('screen-heading-title'),
      screenHeadingDesc: document.getElementById('screen-heading-subtitle'),
      connectionBadge: document.getElementById('connection-status-badge'),
      themeToggle: document.getElementById('theme-toggle-btn'),
      keyboardBtn: document.getElementById('keyboard-help-btn'),
      keyboardModal: document.getElementById('keyboard-guide-modal'),
      shopSidebarTitle: document.getElementById('shop-sidebar-title'),
      userAvatar: document.getElementById('user-avatar-initials'),
      userDisplayName: document.getElementById('user-display-name'),
      userDisplayRole: document.getElementById('user-display-role')
    };
  }

  init() {
    initRipples();
    this.bindEvents();
    this.checkSession();
    this.initNetworkBadge();
  }

  bindEvents() {
    // Login Submit Handler
    this.dom.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = this.dom.loginUsername.value.trim();
      const pass = this.dom.loginPassword.value;
      
      try {
        const session = await auth.login(user, pass);
        toast.success(`Welcome back, ${session.name}!`, 'Access Granted');
        this.dom.loginUsername.value = '';
        this.dom.loginPassword.value = '';
        this.enterApp(session);
      } catch (err) {
        toast.error(err.message, 'Login Failed');
      }
    });

    // Sidebar Navigation Click
    this.dom.menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const screenId = item.getAttribute('data-screen');
        this.switchScreen(screenId);
        // On mobile, close sidebar automatically on selection
        this.dom.sidebar.classList.remove('mobile-open');
      });
    });

    // Mobile Hamburger Switcher
    this.dom.mobileToggle.addEventListener('click', () => {
      this.dom.sidebar.classList.toggle('mobile-open');
    });

    // Theme Switch (Light/Dark)
    this.dom.themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      this.dom.themeToggle.querySelector('i').innerText = isLight ? 'dark_mode' : 'light_mode';
      toast.info(isLight ? "Light Mode Activated" : "Dark Mode Activated", "Theme Changed");
    });

    // Logout Click
    this.dom.logoutBtn.addEventListener('click', () => {
      // Auto-trigger security database JSON backup export on sign out
      try {
        db.exportBackup();
        toast.success("Security backup JSON file exported successfully.", "Backup Downloaded");
      } catch (err) {
        console.warn("Failed to auto-export backup on logout:", err);
      }

      auth.logout();
      this.exitApp();
      toast.info("You have successfully signed out.", "Logged Out");
    });

    // Keyboard Guides Click
    this.dom.keyboardBtn.addEventListener('click', () => {
      this.dom.keyboardModal.classList.add('active');
    });

    // Forgot Password Link & Modal selectors
    const forgotLink = document.getElementById('login-forgot-link');
    const forgotModal = document.getElementById('forgot-password-modal');

    // Forgot Password Link Click
    if (forgotLink && forgotModal) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Show Firebase helper note if online Firebase sync is active
        const fbSection = document.getElementById('forgot-firebase-section');
        if (fbSection) {
          fbSection.style.display = (db.firestore && db.isOnline && typeof firebase !== 'undefined') ? 'block' : 'none';
        }
        
        forgotModal.classList.add('active');
      });
    }

    // Forgot Password Form Submit
    const forgotForm = document.getElementById('forgot-password-form');
    if (forgotForm && forgotModal) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('forgot-username').value.trim();
        const restoreFile = document.getElementById('forgot-restore-file').files[0];
        
        try {
          if (restoreFile) {
            // Restore from offline backup file
            await db.importBackup(restoreFile);
            toast.success("Database restored successfully from backup JSON. Try signing in now.", "Database Restored");
            forgotModal.classList.remove('active');
            forgotForm.reset();
            return;
          }
          
          // Else: Firebase email password reset
          if (db.firestore && db.isOnline && typeof firebase !== 'undefined') {
            const email = username.includes('@') ? username : `${username}@resotpos.local`;
            await firebase.auth().sendPasswordResetEmail(email);
            toast.success(`Firebase password reset link sent to ${email}`, "Email Dispatched");
            forgotModal.classList.remove('active');
            forgotForm.reset();
          } else {
            toast.warning("Offline Mode: Please select a database backup file to restore credentials.", "Action Required");
          }
        } catch (err) {
          toast.error(err.message, "Password Recovery Error");
        }
      });
    }
  }

  checkSession() {
    if (auth.isLoggedIn()) {
      this.enterApp(auth.getCurrentUser());
    } else {
      this.exitApp();
    }
  }

  enterApp(session) {
    this.dom.loginScreen.style.display = 'none';
    this.dom.appShell.style.display = 'flex';
    
    // Set Profile details
    this.dom.userDisplayName.innerText = session.name;
    this.dom.userDisplayRole.innerText = session.role;
    
    const nameWords = session.name.split(' ');
    const initials = nameWords.map(w => w[0]).join('').slice(0, 2).toUpperCase();
    this.dom.userAvatar.innerText = initials;
    
    // Set Shop Title
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    this.dom.shopSidebarTitle.innerText = settings.shopName || 'Resot Kitchen';

    // Toggle menu visibility based on authorization rules
    this.dom.menuItems.forEach(item => {
      const screenId = item.getAttribute('data-screen');
      if (auth.hasAccess(screenId)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });

    // Restrict Firebase Sync Settings card visibility to Super Admin only
    const fbSyncCard = document.getElementById('firebase-sync-card');
    if (fbSyncCard) {
      fbSyncCard.style.display = (session.role === 'Super Admin') ? 'block' : 'none';
    }

    // Initialize all app modules
    pos.init();
    kitchen.init();
    products.init();
    expenses.init();
    reports.init();
    printerSettings.init();
    users.init();

    // Default Starting View based on screen permissions priority
    if (auth.hasAccess('dashboard')) {
      this.switchScreen('dashboard');
    } else if (auth.hasAccess('pos')) {
      this.switchScreen('pos');
    } else if (auth.hasAccess('kitchen')) {
      this.switchScreen('kitchen');
    }
  }

  exitApp() {
    this.dom.appShell.style.display = 'none';
    this.dom.loginScreen.style.display = 'flex';
  }

  switchScreen(screenId) {
    if (!auth.hasAccess(screenId)) {
      toast.warning("You do not have access credentials for this screen.", "Access Denied");
      return;
    }
    
    // 1. Swap active panels classes
    document.querySelectorAll('.screen-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    const targetPanel = document.getElementById(`${screenId}-screen`);
    if (targetPanel) {
      targetPanel.classList.add('active');
      this.activeScreen = screenId;
    }

    // 2. Highlight active menu item
    this.dom.menuItems.forEach(item => {
      if (item.getAttribute('data-screen') === screenId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 3. Update Title heading info
    const headings = {
      'dashboard': { title: 'Dashboard Analytics', subtitle: 'Overview of store revenues and margins' },
      'pos': { title: 'POS Billing Terminal', subtitle: 'Tap items to compose invoice' },
      'products': { title: 'Product Catalog Management', subtitle: 'Modify food catalog, popular items, and categories' },
      'kitchen': { title: 'Kitchen Order Board', subtitle: 'Active KOT orders preparation tracker' },
      'expenses': { title: 'Store Expenses Logger', subtitle: 'Record utility supply costs and miscellaneous payments' },
      'reports': { title: 'Business Report Dashboards', subtitle: 'Generate sales statements, download spreadsheets and PDFs' },
      'printer-settings': { title: 'Printer Settings Configurations', subtitle: 'Thermal size parameters (58mm/80mm) and layout templates' },
      'shop-settings': { title: 'Shop Parameter Settings', subtitle: 'Store details, tax slabs, and cloud syncing setups' },
      'user-management': { title: 'POS Users Administration', subtitle: 'Register user credentials and role authorizations' }
    };

    const header = headings[screenId] || { title: 'Point of Sale', subtitle: '' };
    this.dom.screenHeading.innerText = header.title;
    this.dom.screenHeadingDesc.innerText = header.subtitle;

    // Trigger specific screen refreshes
    if (screenId === 'dashboard') reports.updateDashboardCounters();
    if (screenId === 'pos') pos.refreshCatalog();
    if (screenId === 'kitchen') kitchen.renderTickets();
    if (screenId === 'products') products.loadData();
    if (screenId === 'expenses') expenses.loadLedger();
    if (screenId === 'reports') reports.renderDashboardCharts();
  }

  initNetworkBadge() {
    const updateBadge = (online) => {
      if (online) {
        this.dom.connectionBadge.className = 'badge badge-success';
        this.dom.connectionBadge.querySelector('span').innerText = 'Online';
        this.dom.connectionBadge.querySelector('i').innerText = 'wifi';
      } else {
        this.dom.connectionBadge.className = 'badge badge-danger';
        this.dom.connectionBadge.querySelector('span').innerText = 'Offline';
        this.dom.connectionBadge.querySelector('i').innerText = 'wifi_off';
      }
    };
    
    updateBadge(navigator.onLine);
    db.onNetworkChange(updateBadge);
  }
}

export const app = new ApplicationCoordinator();

// Launch SPA
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
