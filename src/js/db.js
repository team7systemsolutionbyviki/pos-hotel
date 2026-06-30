// Seed Data for instantly running the POS application
const SEED_DATA = {
  categories: [
    { id: 'cat-1', name: 'Tea', status: 'active' },
    { id: 'cat-2', name: 'Coffee', status: 'active' },
    { id: 'cat-3', name: 'Juice', status: 'active' },
    { id: 'cat-4', name: 'Snacks', status: 'active' },
    { id: 'cat-5', name: 'Meals', status: 'active' },
    { id: 'cat-6', name: 'Combo', status: 'active' },
    { id: 'cat-7', name: 'Dessert', status: 'active' },
    { id: 'cat-8', name: 'Drinks', status: 'active' }
  ],
  products: [
    { id: 'p-1', name: 'Masala Chai', category: 'Tea', price: 20, costPrice: 8, status: 'available', popular: true, image: '' },
    { id: 'p-2', name: 'Elachi Tea', category: 'Tea', price: 25, costPrice: 10, status: 'available', popular: false, image: '' },
    { id: 'p-3', name: 'Cappuccino', category: 'Coffee', price: 90, costPrice: 35, status: 'available', popular: true, image: '' },
    { id: 'p-4', name: 'Espresso', category: 'Coffee', price: 70, costPrice: 25, status: 'available', popular: false, image: '' },
    { id: 'p-5', name: 'Cold Coffee', category: 'Coffee', price: 110, costPrice: 45, status: 'available', popular: true, image: '' },
    { id: 'p-6', name: 'Fresh Orange Juice', category: 'Juice', price: 80, costPrice: 30, status: 'available', popular: false, image: '' },
    { id: 'p-7', name: 'Mango Milkshake', category: 'Juice', price: 100, costPrice: 40, status: 'available', popular: true, image: '' },
    { id: 'p-8', name: 'Samosa (Plate)', category: 'Snacks', price: 40, costPrice: 15, status: 'available', popular: false, image: '' },
    { id: 'p-9', name: 'Paneer Tikka Sand.', category: 'Snacks', price: 120, costPrice: 50, status: 'available', popular: true, image: '' },
    { id: 'p-10', name: 'Veg Club Sandwich', category: 'Snacks', price: 100, costPrice: 40, status: 'available', popular: false, image: '' },
    { id: 'p-11', name: 'South Indian Meals', category: 'Meals', price: 150, costPrice: 65, status: 'available', popular: true, image: '' },
    { id: 'p-12', name: 'North Indian Thali', category: 'Meals', price: 180, costPrice: 80, status: 'available', popular: true, image: '' },
    { id: 'p-13', name: 'Burger + Fries Combo', category: 'Combo', price: 199, costPrice: 90, status: 'available', popular: true, image: '' },
    { id: 'p-14', name: 'Choco Lava Cake', category: 'Dessert', price: 95, costPrice: 40, status: 'available', popular: true, image: '' },
    { id: 'p-15', name: 'Mineral Water 1L', category: 'Drinks', price: 20, costPrice: 10, status: 'available', popular: false, image: '' }
  ],
  users: [
    { id: 'u-1', username: 'superadmin', name: 'Super Admin', role: 'Super Admin', status: 'active', password: 'password' },
    { id: 'u-2', username: 'admin', name: 'Store Admin', role: 'Admin', status: 'active', password: 'password' },
    { id: 'u-3', username: 'cashier', name: 'Cashier John', role: 'Cashier', status: 'active', password: 'password' },
    { id: 'u-4', username: 'kitchen', name: 'Kitchen Staff', role: 'Kitchen', status: 'active', password: 'password' }
  ],
  expenses: [
    { id: 'exp-1', date: '2026-06-28', category: 'Milk', amount: 850, note: 'Daily dairy supply' },
    { id: 'exp-2', date: '2026-06-29', category: 'Vegetables', amount: 1200, note: 'Fresh veggies market' },
    { id: 'exp-3', date: '2026-06-30', category: 'Electricity', amount: 4500, note: 'June Bill' },
    { id: 'exp-4', date: '2026-06-30', category: 'Gas', amount: 1800, note: 'Gas cylinder refill' }
  ],
  settings: {
    shopName: 'Resot Kitchen',
    ownerName: 'Vicky',
    phone: '9876543210',
    email: 'info@resotkitchen.com',
    address: '123 Main Food Street, Cityville',
    gstNumber: '29ABCDE1234F1Z5',
    currency: '₹',
    taxPercentage: 5,
    serviceChargePercentage: 2,
    receiptHeader: 'WELCOME TO RESOT KITCHEN\nQuality Food & Fast Service',
    receiptFooter: 'Thank you for dining with us!\nVisit again soon.',
    logo: '',
    qrCodeText: 'https://resotkitchen.com/pay',
    firebaseConfig: {
      apiKey: "AIzaSyAu1Skx3yD283qYiIRL7UalDofdEt1h1ps",
      authDomain: "deepak-resturent.firebaseapp.com",
      databaseURL: "https://deepak-resturent-default-rtdb.firebaseio.com",
      projectId: "deepak-resturent",
      storageBucket: "deepak-resturent.firebasestorage.app",
      messagingSenderId: "610954364269",
      appId: "1:610954364269:web:5e19c8e133942f737b4664"
    }
  },
  orders: [] // Generated below to provide reports data
};

// Generate some sample orders for the past week
const generateSampleOrders = () => {
  const orders = [];
  const paymentMethods = ['Cash', 'UPI', 'Card'];
  let orderCounter = 1000;
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // 3 to 8 orders per day
    const dailyOrdersCount = Math.floor(Math.random() * 6) + 3;
    
    for (let j = 0; j < dailyOrdersCount; j++) {
      orderCounter++;
      // Randomly select 1 to 4 items
      const itemsCount = Math.floor(Math.random() * 4) + 1;
      const orderItems = [];
      let subtotal = 0;
      let totalCost = 0;
      
      for (let k = 0; k < itemsCount; k++) {
        const randProduct = SEED_DATA.products[Math.floor(Math.random() * SEED_DATA.products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        
        // Avoid duplicate items in same order
        if (!orderItems.find(o => o.id === randProduct.id)) {
          orderItems.push({
            id: randProduct.id,
            name: randProduct.name,
            price: randProduct.price,
            qty: qty,
            costPrice: randProduct.costPrice
          });
          subtotal += randProduct.price * qty;
          totalCost += randProduct.costPrice * qty;
        }
      }
      
      const tax = parseFloat((subtotal * 0.05).toFixed(2));
      const service = parseFloat((subtotal * 0.02).toFixed(2));
      const grandTotal = subtotal + tax + service;
      
      orders.push({
        id: `ORD-${orderCounter}`,
        tokenNumber: Math.floor(Math.random() * 100) + 1,
        date: dateStr,
        time: `${Math.floor(Math.random() * 10) + 10}:${Math.floor(Math.random() * 5) + 1}${Math.floor(Math.random() * 9)}`,
        items: orderItems,
        customerName: Math.random() > 0.6 ? ['Alex', 'David', 'Sarah', 'Emma', 'Roy'][Math.floor(Math.random() * 5)] : '',
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        subtotal: subtotal,
        discount: 0,
        tax: tax,
        serviceCharge: service,
        grandTotal: grandTotal,
        costTotal: totalCost,
        status: 'completed', // completed, held, kitchen
        tableNumber: Math.random() > 0.5 ? String(Math.floor(Math.random() * 12) + 1) : '',
        notes: ''
      });
    }
  }
  return orders;
};

SEED_DATA.orders = generateSampleOrders();

// Database Manager class
class DatabaseManager {
  constructor() {
    this.firebaseApp = null;
    this.firestore = null;
    this.storage = null;
    this.isOnline = navigator.onLine;
    this.localData = {};
    this.listeners = {};
    
    this.initLocal();
    this.initFirebase();
    
    // Listen for connection changes
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  // Set up local storage representation
  initLocal() {
    const keys = Object.keys(SEED_DATA);
    keys.forEach(key => {
      const data = localStorage.getItem(`pos_${key}`);
      if (data) {
        this.localData[key] = JSON.parse(data);
        // Force update settings if firebaseConfig is not set yet in local storage
        if (key === 'settings' && (!this.localData[key].firebaseConfig || !this.localData[key].firebaseConfig.apiKey)) {
          this.localData[key].firebaseConfig = SEED_DATA.settings.firebaseConfig;
          localStorage.setItem('pos_settings', JSON.stringify(this.localData[key]));
        }
      } else {
        this.localData[key] = SEED_DATA[key];
        localStorage.setItem(`pos_${key}`, JSON.stringify(SEED_DATA[key]));
      }
    });
  }

  // Attempt dynamic Firebase initialization
  initFirebase() {
    const settings = this.localData.settings;
    if (settings && settings.firebaseConfig && typeof firebase !== 'undefined') {
      try {
        // Prevent duplicate app initializations
        if (firebase.apps.length === 0) {
          this.firebaseApp = firebase.initializeApp(settings.firebaseConfig);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.firestore = firebase.firestore();
        this.storage = firebase.storage();
        
        // Enable Firestore offline persistence
        this.firestore.enablePersistence({ synchronizeTabs: true })
          .catch((err) => {
            console.warn("Firestore offline persistence failure:", err.code);
          });
          
        // Background sign-in helper to solve permission errors for project "deepak-resturent"
        firebase.auth().onAuthStateChanged((user) => {
          if (!user) {
            firebase.auth().signInAnonymously()
              .then(() => console.log("Firebase anonymous auth successful for online sync."))
              .catch(err => console.warn("Firebase Anonymous auth bypassed. Sync will continue if database rules are public:", err.message));
          } else {
            console.log("Firebase authenticated session active.");
          }
        });

        console.log("Firebase POS initialized successfully.");
      } catch (err) {
        console.error("Failed to initialize Firebase:", err);
      }
    }
  }

  handleNetworkChange(status) {
    this.isOnline = status;
    console.log(status ? "Network restored. Application online." : "Network disconnected. POS running offline.");
    if (status && !this.firestore) {
      this.initFirebase();
    }
    // Fire callback
    if (this.listeners.networkStatus) {
      this.listeners.networkStatus(status);
    }
  }

  onNetworkChange(callback) {
    this.listeners.networkStatus = callback;
  }

  // Core Accessors
  async get(collectionName) {
    if (collectionName === 'settings') {
      if (this.firestore && this.isOnline) {
        try {
          const doc = await this.firestore.collection('settings').doc('store_config').get();
          if (doc.exists) {
            const data = doc.data();
            this.localData['settings'] = data;
            localStorage.setItem('pos_settings', JSON.stringify(data));
            return data;
          } else {
            // Seed local settings to Firestore since it's empty
            const localSettings = this.localData['settings'] || SEED_DATA.settings;
            await this.firestore.collection('settings').doc('store_config').set(localSettings);
            return localSettings;
          }
        } catch (err) {
          console.warn("Firestore settings read failed, loading local fallback:", err);
        }
      }
      return this.localData['settings'] || {};
    }

    if (this.firestore && this.isOnline) {
      try {
        const snapshot = await this.firestore.collection(collectionName).get();
        if (!snapshot.empty) {
          const data = [];
          snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
          });
          // Sync local cache
          this.localData[collectionName] = data;
          localStorage.setItem(`pos_${collectionName}`, JSON.stringify(data));
          return data;
        } else {
          // If remote is empty and it's a seedable collection, upload local seeded data to Firestore
          const localItems = this.localData[collectionName] || SEED_DATA[collectionName] || [];
          const seedableCollections = ['categories', 'products', 'users'];
          
          if (seedableCollections.includes(collectionName) && localItems.length > 0) {
            console.log(`Cloud sync: Seeding remote Firestore collection: ${collectionName} with local elements.`);
            try {
              const batch = this.firestore.batch();
              localItems.forEach(item => {
                const docId = item.id || 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                const itemRef = this.firestore.collection(collectionName).doc(docId);
                const rawItem = { ...item };
                delete rawItem.id;
                batch.set(itemRef, rawItem);
              });
              await batch.commit();
            } catch (seedErr) {
              console.warn(`Firestore seeding failed for ${collectionName}:`, seedErr.message);
            }
          }
          return localItems;
        }
      } catch (err) {
        console.warn("Firestore Read failed, loading local fallback:", err);
        return this.localData[collectionName] || [];
      }
    } else {
      return this.localData[collectionName] || [];
    }
  }

  // Save full collection
  async set(collectionName, data) {
    this.localData[collectionName] = data;
    localStorage.setItem(`pos_${collectionName}`, JSON.stringify(data));

    if (this.firestore) {
      try {
        if (collectionName === 'settings') {
          await this.firestore.collection('settings').doc('store_config').set(data);
        } else {
          // Re-write collection elements sequentially (in a transaction/batch is better for performance)
          const batch = this.firestore.batch();
          
          // First delete existing remote items (simplified override)
          const snapshot = await this.firestore.collection(collectionName).get();
          snapshot.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          // Write new items
          data.forEach(item => {
            const docId = item.id || String(Math.random()).split('.')[1];
            const itemRef = this.firestore.collection(collectionName).doc(docId);
            const rawItem = { ...item };
            delete rawItem.id; // Store without redundant id key
            batch.set(itemRef, rawItem);
          });
          
          await batch.commit();
        }
      } catch (err) {
        console.error("Firestore batch commit failed:", err);
      }
    }
    return data;
  }

  // Add individual record
  async add(collectionName, item) {
    const docId = item.id || 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newItem = { id: docId, ...item };
    
    this.localData[collectionName] = this.localData[collectionName] || [];
    this.localData[collectionName].push(newItem);
    localStorage.setItem(`pos_${collectionName}`, JSON.stringify(this.localData[collectionName]));

    if (this.firestore) {
      try {
        const rawItem = { ...newItem };
        delete rawItem.id;
        await this.firestore.collection(collectionName).doc(docId).set(rawItem);
      } catch (err) {
        console.warn("Offline: Firestore write queued dynamically:", err);
      }
    }
    return newItem;
  }

  // Update specific fields
  async update(collectionName, itemId, updates) {
    this.localData[collectionName] = this.localData[collectionName] || [];
    const index = this.localData[collectionName].findIndex(i => i.id === itemId);
    
    if (index !== -1) {
      this.localData[collectionName][index] = { ...this.localData[collectionName][index], ...updates };
      localStorage.setItem(`pos_${collectionName}`, JSON.stringify(this.localData[collectionName]));
    }

    if (this.firestore) {
      try {
        await this.firestore.collection(collectionName).doc(itemId).update(updates);
      } catch (err) {
        console.warn("Offline: Firestore update deferred:", err);
      }
    }
    return this.localData[collectionName][index];
  }

  // Delete individual record
  async delete(collectionName, itemId) {
    this.localData[collectionName] = this.localData[collectionName] || [];
    this.localData[collectionName] = this.localData[collectionName].filter(i => i.id !== itemId);
    localStorage.setItem(`pos_${collectionName}`, JSON.stringify(this.localData[collectionName]));

    if (this.firestore) {
      try {
        await this.firestore.collection(collectionName).doc(itemId).delete();
      } catch (err) {
        console.warn("Offline: Firestore deletion deferred:", err);
      }
    }
    return true;
  }

  // Backup Local Database as JSON Download
  exportBackup() {
    const backup = {};
    const keys = Object.keys(SEED_DATA);
    keys.forEach(key => {
      backup[key] = JSON.parse(localStorage.getItem(`pos_${key}`)) || this.localData[key];
    });
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    
    const timestamp = new Date().toISOString().slice(0,10);
    downloadAnchor.setAttribute("download", `resot_pos_backup_${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Restore Database from JSON Upload
  async importBackup(jsonFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          
          // Basic validations
          if (!parsed.products || !parsed.categories || !parsed.users || !parsed.settings) {
            throw new Error("Invalid backup format. Missing core sections.");
          }
          
          // Write to local storage
          Object.keys(parsed).forEach(key => {
            localStorage.setItem(`pos_${key}`, JSON.stringify(parsed[key]));
            this.localData[key] = parsed[key];
          });
          
          // Re-trigger firebase config if settings changed
          this.initFirebase();
          
          // Sync all elements to firestore in background
          if (this.firestore && this.isOnline) {
            for (const key of Object.keys(parsed)) {
              await this.set(key, parsed[key]);
            }
          }
          
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File reading error"));
      reader.readAsText(jsonFile);
    });
  }
}

export const db = new DatabaseManager();
