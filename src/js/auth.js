import { db } from './db.js';

class AuthProvider {
  constructor() {
    this.currentUser = null;
    this.initSession();
  }

  initSession() {
    const cached = sessionStorage.getItem('pos_user_session');
    if (cached) {
      this.currentUser = JSON.parse(cached);
    }
  }

  async login(username, password) {
    // 1. Fetch current users list
    const users = await db.get('users');
    
    // 2. Validate against local database
    const localUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (!localUser) {
      throw new Error("Invalid username or password.");
    }
    
    if (localUser.status !== 'active') {
      throw new Error("This user account has been deactivated.");
    }

    // 3. Attempt Firebase authentication in background if active
    if (db.firestore && db.isOnline && typeof firebase !== 'undefined') {
      try {
        // Convert username to email format for Firebase Auth if not already an email
        const email = username.includes('@') ? username : `${username}@resotpos.local`;
        await firebase.auth().signInWithEmailAndPassword(email, password);
      } catch (err) {
        console.warn("Firebase Auth sync bypass (using local credentials verification):", err.message);
      }
    }

    // 4. Set session
    this.currentUser = {
      id: localUser.id,
      username: localUser.username,
      name: localUser.name,
      role: localUser.role
    };
    
    sessionStorage.setItem('pos_user_session', JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem('pos_user_session');
    
    if (db.firestore && typeof firebase !== 'undefined') {
      firebase.auth().signOut().catch(err => console.warn(err));
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Permission Check
  hasAccess(menuItemName) {
    if (!this.isLoggedIn()) return false;
    
    const role = this.currentUser.role;
    
    // Role-based Access Map
    const permissions = {
      'Super Admin': [
        'dashboard', 'pos', 'products', 'kitchen', 
        'expenses', 'reports', 'printer-settings', 
        'shop-settings', 'user-management'
      ],
      'Admin': [
        'dashboard', 'pos', 'products', 'kitchen', 
        'expenses', 'reports', 'printer-settings', 'shop-settings'
      ],
      'Cashier': [
        'pos', 'kitchen' // POS and KOT list access only
      ],
      'Kitchen': [
        'kitchen'
      ]
    };
    
    const allowedMenus = permissions[role] || [];
    return allowedMenus.includes(menuItemName);
  }
}

export const auth = new AuthProvider();
