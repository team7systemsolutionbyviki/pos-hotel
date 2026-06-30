import { db } from './db.js';
import { toast } from './utils.js';

class ExpenseSystem {
  constructor() {
    this.expenses = [];
    this.dom = null;
  }

  init() {
    this.dom = {
      form: document.getElementById('expense-entry-form'),
      date: document.getElementById('exp-date'),
      category: document.getElementById('exp-category'),
      amount: document.getElementById('exp-amount'),
      note: document.getElementById('exp-note'),
      tableBody: document.querySelector('#expenses-log-table tbody'),
      monthFilter: document.getElementById('expense-month-filter')
    };

    // Pre-fill filter with current month (YYYY-MM)
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    this.dom.monthFilter.value = currentMonth;
    this.dom.date.value = today.toISOString().split('T')[0];

    this.bindEvents();
  }

  bindEvents() {
    // Form submit
    this.dom.form.addEventListener('submit', (e) => this.handleExpenseSubmit(e));
    
    // Month filter change
    this.dom.monthFilter.addEventListener('change', () => this.loadLedger());
  }

  async loadLedger() {
    this.expenses = await db.get('expenses');
    this.renderExpenses();
  }

  renderExpenses() {
    this.dom.tableBody.innerHTML = '';
    
    const filterVal = this.dom.monthFilter.value; // YYYY-MM
    
    // Sort descending by date
    const sorted = [...this.expenses].sort((a,b) => b.date.localeCompare(a.date));
    
    // Filter matching month
    const filtered = sorted.filter(exp => exp.date.startsWith(filterVal));

    if (filtered.length === 0) {
      this.dom.tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">No expenses recorded for this month.</td>
        </tr>
      `;
      return;
    }

    filtered.forEach(exp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${exp.date}</td>
        <td><span class="badge badge-danger">${exp.category}</span></td>
        <td>${exp.note || '-'}</td>
        <td style="font-weight:700;">₹${exp.amount.toFixed(2)}</td>
        <td>
          <button class="btn btn-danger btn-icon delete-exp-action" style="width:28px; height:28px;"><i class="material-icons" style="font-size:14px;">delete</i></button>
        </td>
      `;

      tr.querySelector('.delete-exp-action').addEventListener('click', () => this.deleteExpense(exp.id, exp.category, exp.amount));
      this.dom.tableBody.appendChild(tr);
    });
  }

  async handleExpenseSubmit(e) {
    e.preventDefault();
    
    const item = {
      date: this.dom.date.value,
      category: this.dom.category.value,
      amount: parseFloat(this.dom.amount.value) || 0,
      note: this.dom.note.value.trim()
    };

    try {
      await db.add('expenses', item);
      toast.success(`Logged expense: ₹${item.amount.toFixed(2)} for ${item.category}`, "Expense Recorded");
      
      // Reset details but keep today's date
      this.dom.amount.value = '';
      this.dom.note.value = '';
      this.dom.date.value = new Date().toISOString().split('T')[0];
      
      // Reload
      this.loadLedger();
    } catch (err) {
      toast.error(err.message, "Failed to Save Expense");
    }
  }

  async deleteExpense(id, cat, amt) {
    if (confirm(`Delete expense record of ₹${amt.toFixed(2)} for ${cat}?`)) {
      try {
        await db.delete('expenses', id);
        toast.success("Expense record removed.", "Log Discarded");
        this.loadLedger();
      } catch (err) {
        toast.error(err.message, "Failed to Remove");
      }
    }
  }
}

export const expenses = new ExpenseSystem();
