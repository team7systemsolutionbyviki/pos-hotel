import { db } from './db.js';
import { toast } from './utils.js';

class KitchenSystem {
  constructor() {
    this.orders = [];
    this.dom = null;
  }

  init() {
    this.dom = {
      grid: document.getElementById('kot-board-tickets-grid'),
      refreshBtn: document.getElementById('kot-btn-refresh')
    };

    if (this.dom.refreshBtn) {
      this.dom.refreshBtn.addEventListener('click', () => {
        this.renderTickets();
        toast.success("KOT Board refreshed.", "Synced");
      });
    }

    // Set auto refresh interval every 30 seconds
    setInterval(() => {
      if (document.getElementById('kitchen-screen').classList.contains('active')) {
        this.renderTickets();
      }
    }, 30000);
  }

  async renderTickets() {
    this.dom.grid.innerHTML = '';
    
    // Fetch orders
    const allOrders = await db.get('orders');
    
    // Filter orders that are not served (e.g. status completed/preparing/ready)
    // For kitchen, we track orders where status is 'preparing' (default when saved) or 'ready'
    // Let's filter orders completed within today or still active.
    const today = new Date().toISOString().split('T')[0];
    
    // We only display orders from today that are still in preparation or ready
    const activeOrders = allOrders.filter(o => 
      o.date === today && 
      (o.status === 'completed' || o.status === 'preparing' || o.status === 'ready')
    );

    if (activeOrders.length === 0) {
      this.dom.grid.innerHTML = `
        <div style="grid-column: span 12; text-align:center; padding:60px; color:var(--text-secondary);">
          <i class="material-icons" style="font-size:52px; opacity:0.5;">soup_kitchen</i>
          <p style="margin-top:10px; font-weight:500;">No active kitchen orders right now.</p>
        </div>
      `;
      return;
    }

    activeOrders.forEach(order => {
      const ticket = document.createElement('div');
      
      // Determine KOT card class based on preparation status
      let ticketClass = 'kot-ticket';
      let statusLabel = 'Pending';
      let btnHTML = '';

      if (order.status === 'completed') {
        ticketClass += ' pending';
        statusLabel = 'Pending';
        btnHTML = `
          <button class="btn btn-warning start-prep-btn" style="width:100%;"><i class="material-icons">restaurant</i> Start Preparing</button>
        `;
      } else if (order.status === 'preparing') {
        ticketClass += ' preparing';
        statusLabel = 'Preparing';
        btnHTML = `
          <button class="btn btn-success ready-btn" style="width:100%;"><i class="material-icons">check</i> Mark as Ready</button>
        `;
      } else if (order.status === 'ready') {
        ticketClass += ' ready';
        statusLabel = 'Ready';
        btnHTML = `
          <button class="btn btn-outline serve-btn" style="width:100%;"><i class="material-icons">done_all</i> Serve & Clear</button>
        `;
      }

      // Format food items lists
      let itemsList = '';
      order.items.forEach(item => {
        itemsList += `
          <div class="kot-item-row">
            <span>${item.name}</span>
            <span style="font-weight:700;">x ${item.qty}</span>
          </div>
          ${item.notes ? `<div style="font-size:0.75rem; color:var(--warning); padding-bottom:6px; font-style:italic;">* ${item.notes}</div>` : ''}
        `;
      });

      ticket.className = ticketClass;
      ticket.innerHTML = `
        <div class="kot-header">
          <div>
            <div style="font-weight:800; font-family:var(--font-display); font-size:1.05rem;">Token #${order.tokenNumber}</div>
            <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">Bill Ref: ${order.id}</div>
          </div>
          <div style="text-align:right;">
            <span class="badge ${order.status === 'ready' ? 'badge-success' : 'badge-warning'}">${statusLabel}</span>
            <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">Time: ${order.time}</div>
          </div>
        </div>
        <div class="kot-body" style="padding: 10px 0;">
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:6px;">
            ${order.tableNumber ? `Table Number: <strong>${order.tableNumber}</strong>` : 'Takeaway Order'}
            ${order.customerName ? `<br>Cust: <strong>${order.customerName}</strong>` : ''}
          </div>
          <div style="border-top: 1px dashed var(--glass-border); padding-top:8px;">
            ${itemsList}
          </div>
        </div>
        <div class="kot-footer" style="flex-direction:column; gap:8px;">
          <div style="display:flex; width:100%; gap:8px;">
            <button class="btn btn-outline btn-icon print-kot-btn" title="Print KOT Ticket"><i class="material-icons">print</i></button>
            <button class="btn btn-outline btn-icon delete-kot-btn" style="color:var(--danger); border-color:rgba(239,68,68,0.25);" title="Delete KOT Ticket"><i class="material-icons">delete</i></button>
            <div style="flex:1;">${btnHTML}</div>
          </div>
        </div>
      `;

      // Event listeners
      const printBtn = ticket.querySelector('.print-kot-btn');
      printBtn.addEventListener('click', () => this.printKOT(order));

      const prepBtn = ticket.querySelector('.start-prep-btn');
      if (prepBtn) {
        prepBtn.addEventListener('click', () => this.updateStatus(order.id, 'preparing'));
      }

      const readyBtn = ticket.querySelector('.ready-btn');
      if (readyBtn) {
        readyBtn.addEventListener('click', () => this.updateStatus(order.id, 'ready'));
      }

      const serveBtn = ticket.querySelector('.serve-btn');
      if (serveBtn) {
        serveBtn.addEventListener('click', () => this.updateStatus(order.id, 'served'));
      }

      const deleteBtn = ticket.querySelector('.delete-kot-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteKOT(order.id));
      }

      this.dom.grid.appendChild(ticket);
    });
  }

  async updateStatus(orderId, newStatus) {
    try {
      await db.update('orders', orderId, { status: newStatus });
      toast.success(`Order ${orderId} updated to ${newStatus}.`, "Status Saved");
      this.renderTickets();
    } catch (err) {
      toast.error(err.message, "Failed to Update KOT");
    }
  }

  async deleteKOT(orderId) {
    if (confirm(`Are you sure you want to delete KOT ticket ${orderId}? This action cannot be undone.`)) {
      try {
        await db.delete('orders', orderId);
        toast.success(`KOT order ${orderId} deleted successfully.`, "Order Removed");
        this.renderTickets();
      } catch (err) {
        toast.error(err.message, "Deletion Failed");
      }
    }
  }

  // Print separate KOT receipt
  printKOT(order) {
    const printArea = document.getElementById('receipt-print-area');
    if (!printArea) return;

    let itemsHTML = '';
    order.items.forEach(i => {
      itemsHTML += `
        <div class="print-row" style="font-size:14px; font-weight:bold;">
          <span>${i.name}</span>
          <span>Qty: ${i.qty}</span>
        </div>
        ${i.notes ? `<div style="font-size:11px; padding-left:12px; margin-bottom:6px;">* ${i.notes}</div>` : ''}
      `;
    });

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
          ${itemsHTML}
        </div>
        <div class="print-divider" style="border-bottom:1px dashed #000; margin:10px 0;"></div>
        <div style="text-align:center; font-size:11px; font-style:italic;">
          Sent to Preparation
        </div>
      </div>
    `;

    printArea.innerHTML = kotHTML;
    setTimeout(() => {
      window.print();
    }, 100);
  }
}

export const kitchen = new KitchenSystem();
