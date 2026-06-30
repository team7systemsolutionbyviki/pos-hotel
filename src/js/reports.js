import { db } from './db.js';
import { toast, printReceipt } from './utils.js';

class ReportsSystem {
  constructor() {
    this.salesChart = null;
    this.paymentChart = null;
    this.categoryChart = null;
    
    this.startDateVal = '';
    this.endDateVal = '';
  }

  init() {
    this.cacheDOM();
    this.initDates();
    this.bindEvents();
  }

  cacheDOM() {
    this.dom = {
      // Dashboard Cards
      dashSales: document.getElementById('dash-card-sales'),
      dashOrders: document.getElementById('dash-card-orders'),
      dashExpenses: document.getElementById('dash-card-expenses'),
      dashProfit: document.getElementById('dash-card-profit'),
      dashTopProducts: document.getElementById('dash-top-products-list'),
      dashRecentOrdersTable: document.querySelector('#dashboard-recent-orders-table tbody'),
      dashGotoPOS: document.getElementById('dash-btn-goto-pos'),
      
      // Reports Inputs
      startDate: document.getElementById('report-start-date'),
      endDate: document.getElementById('report-end-date'),
      filterBtn: document.getElementById('reports-filter-btn'),
      exportExcelBtn: document.getElementById('reports-export-excel-btn'),
      exportPdfBtn: document.getElementById('reports-export-pdf-btn'),
      printBtn: document.getElementById('reports-print-btn'),
      searchInput: document.getElementById('report-search-input'),
      
      // Financial Labels
      repOrders: document.getElementById('rep-tot-orders'),
      repSales: document.getElementById('rep-gross-sales'),
      repCogs: document.getElementById('rep-cogs'),
      repExpenses: document.getElementById('rep-expenses'),
      repProfit: document.getElementById('rep-net-profit'),
      
      // Tables
      bestSellingTableBody: document.querySelector('#reports-best-selling-table tbody'),
      transactionsTableBody: document.querySelector('#reports-transactions-table tbody')
    };
  }

  initDates() {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    
    // Default range: past 7 days
    const start = new Date();
    start.setDate(today.getDate() - 7);
    const startStr = start.toISOString().split('T')[0];
    
    this.dom.startDate.value = startStr;
    this.dom.endDate.value = endStr;
    
    this.startDateVal = startStr;
    this.endDateVal = endStr;
  }

  bindEvents() {
    // Filter click
    this.dom.filterBtn.addEventListener('click', () => {
      this.startDateVal = this.dom.startDate.value;
      this.endDateVal = this.dom.endDate.value;
      this.renderDashboardCharts();
      toast.success("Reports filtered successfully.", "Updated");
    });

    // Excel export click
    this.dom.exportExcelBtn.addEventListener('click', () => this.exportExcel());

    // PDF export click
    this.dom.exportPdfBtn.addEventListener('click', () => this.exportPDF());

    // Print click
    this.dom.printBtn.addEventListener('click', () => {
      document.body.classList.add('printing-report');
      window.print();
    });

    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-report');
    });

    // Quick POS shortcut from dashboard
    if (this.dom.dashGotoPOS) {
      this.dom.dashGotoPOS.addEventListener('click', () => {
        document.getElementById('menu-pos').click();
      });
    }

    // Live search input filtering
    if (this.dom.searchInput) {
      this.dom.searchInput.addEventListener('input', () => {
        this.renderDashboardCharts();
      });
    }
  }

  // UPDATE DASHBOARD COUNTERS (Tied to dashboard load)
  async updateDashboardCounters() {
    const orders = await db.get('orders');
    const expensesList = await db.get('expenses');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Filter Today's records
    const todayOrders = orders.filter(o => o.date === today && o.status !== 'cancelled' && o.status !== 'served');
    const todayExpenses = expensesList.filter(e => e.date === today);
    
    let salesTotal = 0;
    let costTotal = 0;
    todayOrders.forEach(o => {
      salesTotal += o.grandTotal;
      costTotal += o.costTotal || 0;
    });

    let expensesTotal = 0;
    todayExpenses.forEach(e => {
      expensesTotal += e.amount;
    });

    const netProfit = salesTotal - costTotal - expensesTotal;

    // Render Cards DOM
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const currency = settings.currency || '₹';
    
    this.dom.dashSales.innerText = `${currency}${salesTotal.toFixed(2)}`;
    this.dom.dashOrders.innerText = todayOrders.length;
    this.dom.dashExpenses.innerText = `${currency}${expensesTotal.toFixed(2)}`;
    
    this.dom.dashProfit.innerText = `${currency}${netProfit.toFixed(2)}`;
    this.dom.dashProfit.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';

    // Render dashboard charts (mini-versions or normal)
    this.renderDashboardRecentOrders(orders);
    this.renderDashboardTopSelling(orders);
    this.renderDashboardSalesChart(orders);
  }

  renderDashboardRecentOrders(orders) {
    this.dom.dashRecentOrdersTable.innerHTML = '';
    
    // Get last 5 orders sorted descending
    const sorted = [...orders].sort((a,b) => b.id.localeCompare(a.id)).slice(0, 5);

    if (sorted.length === 0) {
      this.dom.dashRecentOrdersTable.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:20px; color:var(--text-secondary);">No orders generated today.</td>
        </tr>
      `;
      return;
    }

    sorted.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${o.id}</strong></td>
        <td>#${o.tokenNumber}</td>
        <td>${o.time}</td>
        <td>${o.customerName || 'Guest'}</td>
        <td><span class="badge badge-info">${o.paymentMethod}</span></td>
        <td style="font-weight:700;">₹${o.grandTotal.toFixed(2)}</td>
        <td>
          <button class="btn btn-outline btn-icon print-recent-bill-action" style="width:28px; height:28px;"><i class="material-icons" style="font-size:14px;">print</i></button>
        </td>
      `;

      tr.querySelector('.print-recent-bill-action').addEventListener('click', () => {
        const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
        const printOpts = JSON.parse(localStorage.getItem('pos_printer_settings')) || { paperSize: '58mm', showLogo: true, showQr: true, qrText: '', autoPrint: false };
        printReceipt(o, settings, printOpts);
        toast.success(`Printing Receipt ${o.id}`, "Print Sent");
      });

      this.dom.dashRecentOrdersTable.appendChild(tr);
    });
  }

  renderDashboardTopSelling(orders) {
    this.dom.dashTopProducts.innerHTML = '';
    
    // Calculate volumes
    const productVolumes = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        productVolumes[item.name] = (productVolumes[item.name] || 0) + item.qty;
      });
    });

    // Sort descending
    const sortedProducts = Object.keys(productVolumes)
      .map(name => ({ name: name, volume: productVolumes[name] }))
      .sort((a,b) => b.volume - a.volume)
      .slice(0, 5);

    if (sortedProducts.length === 0) {
      this.dom.dashTopProducts.innerHTML = `<p style="text-align:center; color:var(--text-secondary); padding:20px;">No sales data available.</p>`;
      return;
    }

    sortedProducts.forEach((p, idx) => {
      this.dom.dashTopProducts.innerHTML += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); padding:10px 14px; border-radius:var(--border-radius-md);">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-family:var(--font-display); font-weight:800; color:var(--primary); font-size:1.1rem;">#${idx + 1}</span>
            <span style="font-weight:600; font-size:0.9rem;">${p.name}</span>
          </div>
          <span class="badge badge-success">${p.volume} Units</span>
        </div>
      `;
    });
  }

  renderDashboardSalesChart(orders) {
    const ctx = document.getElementById('dashboardSalesChart');
    if (!ctx) return;
    
    // Destroy previous instance
    if (this.salesChart) {
      this.salesChart.destroy();
    }

    // Accumulate sales for the last 7 days
    const last7Days = [];
    const salesData = [];
    const labels = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      last7Days.push(str);
      // Format label e.g. "June 30"
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    last7Days.forEach(date => {
      const daySales = orders
        .filter(o => o.date === date)
        .reduce((sum, o) => sum + o.grandTotal, 0);
      salesData.push(daySales);
    });

    const isDark = !document.body.classList.contains('light-theme');

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Revenues (₹)',
          data: salesData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#94a3b8' : '#475569' }
          },
          y: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#94a3b8' : '#475569' }
          }
        }
      }
    });
  }

  // RENDER DETAILED REPORTS CHARTS & TABLES
  async renderDashboardCharts() {
    const orders = await db.get('orders');
    const expensesList = await db.get('expenses');
    
    // Filter records within the selected range
    const filteredOrders = orders.filter(o => o.date >= this.startDateVal && o.date <= this.endDateVal);
    const filteredExpenses = expensesList.filter(e => e.date >= this.startDateVal && e.date <= this.endDateVal);
    
    // Calculate Financial metrics
    let grossSales = 0;
    let totalCogs = 0;
    filteredOrders.forEach(o => {
      grossSales += o.grandTotal;
      totalCogs += o.costTotal || 0;
    });

    let totalExp = 0;
    filteredExpenses.forEach(e => {
      totalExp += e.amount;
    });

    const profit = grossSales - totalCogs - totalExp;

    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const currency = settings.currency || '₹';

    // Set DOM labels
    this.dom.repOrders.innerText = filteredOrders.length;
    this.dom.repSales.innerText = `${currency}${grossSales.toFixed(2)}`;
    this.dom.repCogs.innerText = `${currency}${totalCogs.toFixed(2)}`;
    this.dom.repExpenses.innerText = `${currency}${totalExp.toFixed(2)}`;
    this.dom.repProfit.innerText = `${currency}${profit.toFixed(2)}`;
    this.dom.repProfit.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';

    // Render payment split charts
    this.renderPaymentMethodChart(filteredOrders);
    
    // Render detailed Cash, UPI, Card, Split table lists
    this.renderPaymentBreakdown(filteredOrders);
    
    // Render Category Split charts
    this.renderCategoryChart(filteredOrders);

    // Render best-selling table
    this.renderBestSellingTable(filteredOrders);

    // Filter transactions list by search query (customer name or bill no)
    const searchQuery = this.dom.searchInput ? this.dom.searchInput.value.trim().toLowerCase() : '';
    const filteredLedger = filteredOrders.filter(o => {
      if (!searchQuery) return true;
      const cust = (o.customerName || '').toLowerCase();
      const billNo = (o.id || '').toLowerCase();
      return cust.includes(searchQuery) || billNo.includes(searchQuery);
    });

    // Render detailed Transactions Ledger table
    this.renderTransactionsTable(filteredLedger);
  }

  renderPaymentMethodChart(orders) {
    const ctx = document.getElementById('paymentMethodChart');
    if (!ctx) return;

    if (this.paymentChart) this.paymentChart.destroy();

    const methods = { 'Cash': 0, 'UPI': 0, 'Card': 0, 'Split': 0 };
    orders.forEach(o => {
      methods[o.paymentMethod] = (methods[o.paymentMethod] || 0) + o.grandTotal;
    });

    const isDark = !document.body.classList.contains('light-theme');

    this.paymentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(methods),
        datasets: [{
          data: Object.values(methods),
          backgroundColor: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: isDark ? '#94a3b8' : '#475569', boxWidth: 12 }
          }
        }
      }
    });
  }

  renderCategoryChart(orders) {
    const ctx = document.getElementById('categorySalesChart');
    if (!ctx) return;

    if (this.categoryChart) this.categoryChart.destroy();

    // Map categories sum
    const catSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        // We look up category mapping. Since item details inside orders may lack category, we fetch
        // local product category if available, fallback to 'Uncategorized'
        const category = item.category || 'Other';
        catSales[category] = (catSales[category] || 0) + (item.price * item.qty);
      });
    });

    const isDark = !document.body.classList.contains('light-theme');

    this.categoryChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(catSales),
        datasets: [{
          label: 'Revenue (₹)',
          data: Object.values(catSales),
          backgroundColor: '#ec4899',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: isDark ? '#94a3b8' : '#475569' }
          },
          y: {
            grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: isDark ? '#94a3b8' : '#475569' }
          }
        }
      }
    });
  }

  renderBestSellingTable(orders) {
    this.dom.bestSellingTableBody.innerHTML = '';

    const productsMap = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!productsMap[item.name]) {
          productsMap[item.name] = {
            name: item.name,
            qty: 0,
            revenue: 0,
            cost: 0
          };
        }
        productsMap[item.name].qty += item.qty;
        productsMap[item.name].revenue += item.price * item.qty;
        productsMap[item.name].cost += (item.costPrice || (item.price * 0.4)) * item.qty;
      });
    });

    const sorted = Object.values(productsMap).sort((a,b) => b.qty - a.qty);

    if (sorted.length === 0) {
      this.dom.bestSellingTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">No sales transactions in this period.</td>
        </tr>
      `;
      return;
    }

    sorted.forEach(p => {
      const margin = p.revenue - p.cost;
      const marginPercent = p.revenue > 0 ? ((margin / p.revenue) * 100).toFixed(0) : 0;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td>${p.qty}</td>
        <td>₹${p.revenue.toFixed(2)}</td>
        <td>
          <span class="badge badge-success">₹${margin.toFixed(2)} (${marginPercent}%)</span>
        </td>
      `;
      this.dom.bestSellingTableBody.appendChild(tr);
    });
  }

  // EXPORT TO EXCEL SPREADSHEET (SheetJS)
  async exportExcel() {
    try {
      const orders = await db.get('orders');
      const expenses = await db.get('expenses');
      
      // 1. Map Orders Sheet
      const ordersData = orders.map(o => ({
        "Order ID": o.id,
        "Token": o.tokenNumber,
        "Date": o.date,
        "Time": o.time,
        "Customer": o.customerName || 'Guest',
        "Payment Mode": o.paymentMethod,
        "Subtotal (₹)": o.subtotal,
        "Discount (₹)": o.discount,
        "GST (₹)": o.tax,
        "Service Fee (₹)": o.serviceCharge,
        "Grand Total (₹)": o.grandTotal,
        "COGS Cost (₹)": o.costTotal
      }));
      
      // 2. Map Expenses Sheet
      const expensesData = expenses.map(e => ({
        "Date": e.date,
        "Category": e.category,
        "Description": e.note || '',
        "Amount (₹)": e.amount
      }));

      // Create Workbook
      const wb = XLSX.utils.book_new();
      
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
      
      XLSX.utils.book_append_sheet(wb, wsOrders, "Sales Logs");
      XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses Ledger");
      
      XLSX.writeFile(wb, `pos_sales_report_${this.startDateVal}_to_${this.endDateVal}.xlsx`);
      toast.success("Excel sheet downloaded.", "Export Complete");
    } catch (err) {
      toast.error(err.message, "Excel Export Failed");
    }
  }

  // EXPORT VIEW PORT AS PDF (jsPDF + html2canvas)
  exportPDF() {
    const reportPanel = document.getElementById('reports-screen');
    if (!reportPanel) return;
    
    toast.info("Generating PDF page layouts...", "Please wait");

    // Add printing-report class so the containers expand and hide menus/buttons
    document.body.classList.add('printing-report');

    // Wait a brief moment for DOM resizing and styling updates to apply
    setTimeout(() => {
      html2canvas(reportPanel, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        // Restore class immediately after capture
        document.body.classList.remove('printing-report');

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 Width
        const pageHeight = 295; // A4 Height
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`pos_report_summary_${this.startDateVal}_to_${this.endDateVal}.pdf`);
        toast.success("PDF Downloaded successfully.", "Export Complete");
      }).catch(err => {
        document.body.classList.remove('printing-report');
        toast.error(err.message, "PDF Canvas Error");
      });
    }, 200);
  }

  // Render Cash, UPI, Card, Split breakdown summary tables
  renderPaymentBreakdown(orders) {
    const box = document.getElementById('reports-payment-breakdown-box');
    if (!box) return;

    const breakdown = {
      'Cash': { sum: 0, count: 0, color: '#10b981' },
      'UPI': { sum: 0, count: 0, color: '#06b6d4' },
      'Card': { sum: 0, count: 0, color: '#6366f1' },
      'Split': { sum: 0, count: 0, color: '#f59e0b' }
    };

    orders.forEach(o => {
      const method = o.paymentMethod || 'Cash';
      if (breakdown[method]) {
        breakdown[method].sum += o.grandTotal;
        breakdown[method].count += 1;
      }
    });

    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const currency = settings.currency || '₹';

    let html = `
      <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem;">
        <thead>
          <tr style="border-bottom:1px solid var(--glass-border); color:var(--text-secondary);">
            <th style="padding:4px 0;">Method</th>
            <th style="padding:4px 0; text-align:right;">Orders</th>
            <th style="padding:4px 0; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.keys(breakdown).forEach(key => {
      const data = breakdown[key];
      html += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
          <td style="padding:6px 0; display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:7px; height:7px; background:${data.color}; border-radius:50%;"></span>
            <strong>${key}</strong>
          </td>
          <td style="text-align:right; color:var(--text-secondary);">${data.count}</td>
          <td style="text-align:right; font-weight:600; color:var(--text-primary);">${currency}${data.sum.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
    
    box.innerHTML = html;
  }

  // Render transactions ledger table
  renderTransactionsTable(orders) {
    if (!this.dom.transactionsTableBody) return;
    this.dom.transactionsTableBody.innerHTML = '';
    
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const currency = settings.currency || '₹';

    if (orders.length === 0) {
      this.dom.transactionsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:20px; color:var(--text-secondary);">No matching transactions found.</td>
        </tr>
      `;
      return;
    }

    orders.forEach(o => {
      const tr = document.createElement('tr');
      const totalItems = o.items ? o.items.reduce((sum, item) => sum + item.qty, 0) : 0;
      
      tr.innerHTML = `
        <td><strong>#${o.id}</strong></td>
        <td>${o.date} ${o.time || ''}</td>
        <td>${o.customerName || 'Walk-in Customer'}</td>
        <td><span class="badge ${o.paymentMethod === 'Cash' ? 'badge-success' : o.paymentMethod === 'UPI' ? 'badge-primary' : o.paymentMethod === 'Split' ? 'badge-warning' : 'badge-info'}" style="padding:4px 8px; font-size:0.7rem;">${o.paymentMethod}</span></td>
        <td>${totalItems}</td>
        <td style="font-weight:600;">${currency}${o.grandTotal.toFixed(2)}</td>
        <td>
          <button class="btn btn-text btn-reprint-receipt" style="padding:4px 8px; font-size:0.7rem; border:1px solid var(--glass-border); border-radius:var(--border-radius-sm); font-weight:500;"><i class="material-icons" style="font-size:14px; vertical-align:middle; margin-right:2px;">print</i> Reprint</button>
        </td>
      `;
      
      // Bind click on the reprint button
      const btn = tr.querySelector('.btn-reprint-receipt');
      if (btn) {
        btn.addEventListener('click', () => {
          const printOpts = JSON.parse(localStorage.getItem('pos_printer_settings')) || { paperSize: '3inch', showHeader: true, showLogo: true, logoPosition: 'center', showGst: true, showQr: true, showFooter: true, qrText: '', autoPrint: false };
          printReceipt(o, settings, printOpts);
          toast.success(`Reprinting bill ${o.id}`, "Receipt Sent");
        });
      }

      this.dom.transactionsTableBody.appendChild(tr);
    });
  }
}

export const reports = new ReportsSystem();
