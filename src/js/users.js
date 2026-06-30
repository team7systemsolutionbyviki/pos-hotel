import { db } from './db.js';
import { toast } from './utils.js';

class UsersAdministration {
  constructor() {
    this.users = [];
    this.editingUser = null;
    this.dom = null;
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
  }

  cacheDOM() {
    this.dom = {
      tableBody: document.querySelector('#users-list-table tbody'),
      modal: document.getElementById('user-form-modal'),
      form: document.getElementById('user-crud-form'),
      userId: document.getElementById('user-form-id'),
      fullName: document.getElementById('user-form-fullname'),
      username: document.getElementById('user-form-username'),
      password: document.getElementById('user-form-password'),
      role: document.getElementById('user-form-role'),
      status: document.getElementById('user-form-status'),
      newUserBtn: document.getElementById('user-btn-new-user')
    };
  }

  bindEvents() {
    // Open new user modal
    this.dom.newUserBtn.addEventListener('click', () => this.openUserModal());

    // Form save
    this.dom.form.addEventListener('submit', (e) => this.handleUserSubmit(e));
  }

  async loadData() {
    this.users = await db.get('users');
    this.renderUsers();
  }

  renderUsers() {
    this.dom.tableBody.innerHTML = '';
    
    if (this.users.length === 0) {
      this.dom.tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:20px; color:var(--text-secondary);">No system users registered.</td>
        </tr>
      `;
      return;
    }

    this.users.forEach(user => {
      const isActive = user.status === 'active';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${user.name}</strong></td>
        <td>${user.username}</td>
        <td>
          <span class="badge ${user.role === 'Super Admin' ? 'badge-danger' : (user.role === 'Admin' ? 'badge-warning' : 'badge-info')}">
            ${user.role}
          </span>
        </td>
        <td>
          <span class="badge ${isActive ? 'badge-success' : 'badge-danger'} status-toggle-lbl" style="cursor:pointer;">
            ${isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-icon edit-user-action" title="Edit User"><i class="material-icons" style="font-size:16px;">edit</i></button>
            <button class="btn btn-danger btn-icon delete-user-action" title="Delete User"><i class="material-icons" style="font-size:16px;">delete</i></button>
          </div>
        </td>
      `;

      // Status toggle click
      tr.querySelector('.status-toggle-lbl').addEventListener('click', async () => {
        // Prevent deactivating own account
        const currentSession = JSON.parse(sessionStorage.getItem('pos_user_session'));
        if (currentSession && currentSession.id === user.id) {
          toast.warning("You cannot suspend your own active account.", "Action Refused");
          return;
        }

        const nextStatus = user.status === 'active' ? 'inactive' : 'active';
        await db.update('users', user.id, { status: nextStatus });
        user.status = nextStatus;
        this.renderUsers();
        toast.success(`User ${user.username} status updated to ${nextStatus}.`, "User Saved");
      });

      // Actions
      tr.querySelector('.edit-user-action').addEventListener('click', () => this.openUserModal(user));
      tr.querySelector('.delete-user-action').addEventListener('click', () => this.deleteUser(user));

      this.dom.tableBody.appendChild(tr);
    });
  }

  openUserModal(user = null) {
    this.editingUser = user;
    
    if (user) {
      document.getElementById('user-modal-title').innerText = "Edit System User";
      this.dom.userId.value = user.id;
      this.dom.fullName.value = user.name;
      this.dom.username.value = user.username;
      this.dom.password.value = user.password;
      this.dom.role.value = user.role;
      this.dom.status.value = user.status;
      
      // Let admins view/edit current password or type a new one
      this.dom.password.removeAttribute('required');
      this.dom.password.placeholder = "Enter new password (optional)";
    } else {
      document.getElementById('user-modal-title').innerText = "Register New POS User";
      this.dom.form.reset();
      this.dom.userId.value = '';
      this.dom.password.setAttribute('required', 'true');
      this.dom.password.placeholder = "Enter account password";
    }

    this.dom.modal.classList.add('active');
  }

  async handleUserSubmit(e) {
    e.preventDefault();
    
    const id = this.dom.userId.value;
    const item = {
      name: this.dom.fullName.value.trim(),
      username: this.dom.username.value.trim().toLowerCase(),
      password: this.dom.password.value,
      role: this.dom.role.value,
      status: this.dom.status.value
    };

    // Username duplicates validation
    const duplicate = this.users.find(u => u.username === item.username && u.id !== id);
    if (duplicate) {
      toast.warning(`Username "${item.username}" is already taken.`, "Duplicate Username");
      return;
    }

    try {
      if (id) {
        // If password field is empty, retain current password
        if (!item.password) {
          delete item.password; // Do not overwrite with empty string
        }
        await db.update('users', id, item);
        toast.success(`Successfully saved user details for: ${item.username}`, "Account Saved");
      } else {
        await db.add('users', item);
        toast.success(`Successfully created system account: ${item.username}`, "Account Created");
      }
      this.dom.modal.classList.remove('active');
      this.loadData();
    } catch (err) {
      toast.error(err.message, "Failed to Save User Details");
    }
  }

  async deleteUser(user) {
    // Prevent deleting own account
    const currentSession = JSON.parse(sessionStorage.getItem('pos_user_session'));
    if (currentSession && currentSession.id === user.id) {
      toast.warning("You cannot delete your own active session account.", "Action Refused");
      return;
    }

    if (confirm(`Are you sure you want to completely delete user "${user.name}"?`)) {
      try {
        await db.delete('users', user.id);
        toast.success(`User ${user.username} removed from database.`, "Account Deleted");
        this.loadData();
      } catch (err) {
        toast.error(err.message, "Failed to Remove User");
      }
    }
  }
}

export const users = new UsersAdministration();
export { UsersAdministration };
