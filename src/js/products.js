import { db } from './db.js';
import { toast, compressImage } from './utils.js';

class ProductManager {
  constructor() {
    this.products = [];
    this.categories = [];
    this.editingProduct = null;
    this.editingCategory = null;
  }

  init() {
    this.cacheDOM();
    this.bindEvents();
  }

  cacheDOM() {
    this.dom = {
      productTableBody: document.querySelector('#products-list-table tbody'),
      categoriesList: document.getElementById('product-categories-manager-list'),
      
      // Product Form Modal
      productModal: document.getElementById('product-form-modal'),
      productForm: document.getElementById('product-crud-form'),
      prodId: document.getElementById('prod-form-id'),
      prodName: document.getElementById('prod-form-name'),
      prodCategory: document.getElementById('prod-form-category'),
      prodCost: document.getElementById('prod-form-cost'),
      prodPrice: document.getElementById('prod-form-price'),
      prodStatus: document.getElementById('prod-form-status'),
      prodPopular: document.getElementById('prod-form-popular'),
      prodImgFile: document.getElementById('prod-form-image-file'),
      prodImgPreview: document.getElementById('prod-form-image-preview'),
      newProductBtn: document.getElementById('prod-btn-new-product'),
      
      // Category Form Modal
      categoryModal: document.getElementById('category-form-modal'),
      categoryForm: document.getElementById('category-crud-form'),
      catId: document.getElementById('cat-form-id'),
      catName: document.getElementById('cat-form-name'),
      newCategoryBtn: document.getElementById('category-btn-add')
    };
  }

  bindEvents() {
    // Show new product modal
    this.dom.newProductBtn.addEventListener('click', () => this.openProductModal());

    // Show new category modal
    this.dom.newCategoryBtn.addEventListener('click', () => this.openCategoryModal());

    // Handle compressed base64 image preview when file changes
    this.dom.prodImgFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const base64 = await compressImage(file, 250, 250);
          this.dom.prodImgPreview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
          this.dom.prodImgPreview.dataset.base64 = base64;
        } catch (err) {
          toast.error("Failed to process product image.", "Image Error");
        }
      }
    });

    // Product form submission
    this.dom.productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));

    // Category form submission
    this.dom.categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
  }

  async loadData() {
    this.products = await db.get('products');
    this.categories = await db.get('categories');
    this.renderProducts();
    this.renderCategories();
    this.populateCategoryDropdown();
  }

  populateCategoryDropdown() {
    this.dom.prodCategory.innerHTML = '';
    this.categories.forEach(cat => {
      if (cat.status === 'active') {
        this.dom.prodCategory.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      }
    });
  }

  renderProducts() {
    this.dom.productTableBody.innerHTML = '';
    
    if (this.products.length === 0) {
      this.dom.productTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color:var(--text-secondary);">No products in catalog. Click "New Product" to begin.</td>
        </tr>
      `;
      return;
    }

    this.products.forEach(p => {
      const isOutOfStock = p.status === 'outofstock';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:6px; overflow:hidden; background:rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center;">
              ${p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">` : `
                <i class="material-icons" style="font-size:18px; color:var(--text-muted);">restaurant</i>
              `}
            </div>
            <span style="font-weight:600;">${p.name}</span>
          </div>
        </td>
        <td>${p.category}</td>
        <td>₹${p.costPrice.toFixed(2)}</td>
        <td>₹${p.price.toFixed(2)}</td>
        <td>
          <label class="toggle-switch">
            <input type="checkbox" class="popular-toggle" ${p.popular ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <span class="badge ${isOutOfStock ? 'badge-danger' : 'badge-success'} status-lbl" style="cursor:pointer;">
            ${isOutOfStock ? 'Out of Stock' : 'Available'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-icon edit-prod-action" title="Edit Product"><i class="material-icons" style="font-size:16px;">edit</i></button>
            <button class="btn btn-danger btn-icon delete-prod-action" title="Delete Product"><i class="material-icons" style="font-size:16px;">delete</i></button>
          </div>
        </td>
      `;

      // Event listeners for quick toggles
      tr.querySelector('.popular-toggle').addEventListener('change', async (e) => {
        await db.update('products', p.id, { popular: e.target.checked });
        toast.success(`Updated ${p.name} popular flag.`, "Catalog Saved");
      });

      tr.querySelector('.status-lbl').addEventListener('click', async () => {
        const nextStatus = p.status === 'available' ? 'outofstock' : 'available';
        await db.update('products', p.id, { status: nextStatus });
        p.status = nextStatus;
        this.renderProducts();
        toast.success(`Updated status of ${p.name}.`, "Catalog Saved");
      });

      tr.querySelector('.edit-prod-action').addEventListener('click', () => this.openProductModal(p));
      tr.querySelector('.delete-prod-action').addEventListener('click', () => this.deleteProduct(p.id, p.name));

      this.dom.productTableBody.appendChild(tr);
    });
  }

  renderCategories() {
    this.dom.categoriesList.innerHTML = '';
    
    if (this.categories.length === 0) {
      this.dom.categoriesList.innerHTML = `
        <p style="text-align:center; padding:20px; color:var(--text-secondary);">No categories.</p>
      `;
      return;
    }

    this.categories.forEach(cat => {
      const card = document.createElement('div');
      card.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:var(--border-radius-md); border:1px solid var(--glass-border);';
      
      const count = this.products.filter(p => p.category === cat.name).length;
      
      card.innerHTML = `
        <div>
          <span style="font-weight:600;">${cat.name}</span>
          <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:8px;">(${count} items)</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline btn-icon edit-cat-btn" style="width:28px; height:28px;"><i class="material-icons" style="font-size:14px;">edit</i></button>
          <button class="btn btn-danger btn-icon delete-cat-btn" style="width:28px; height:28px;"><i class="material-icons" style="font-size:14px;">delete</i></button>
        </div>
      `;

      card.querySelector('.edit-cat-btn').addEventListener('click', () => this.openCategoryModal(cat));
      card.querySelector('.delete-cat-btn').addEventListener('click', () => this.deleteCategory(cat.id, cat.name));

      this.dom.categoriesList.appendChild(card);
    });
  }

  // MODAL - Open Product
  openProductModal(prod = null) {
    this.populateCategoryDropdown();
    this.editingProduct = prod;

    if (prod) {
      document.getElementById('prod-modal-title').innerText = "Edit Product Details";
      this.dom.prodId.value = prod.id;
      this.dom.prodName.value = prod.name;
      this.dom.prodCategory.value = prod.category;
      this.dom.prodCost.value = prod.costPrice;
      this.dom.prodPrice.value = prod.price;
      this.dom.prodStatus.value = prod.status;
      this.dom.prodPopular.checked = prod.popular;
      this.dom.prodImgFile.value = '';
      
      if (prod.image) {
        this.dom.prodImgPreview.innerHTML = `<img src="${prod.image}" style="width:100%; height:100%; object-fit:cover;">`;
        this.dom.prodImgPreview.dataset.base64 = prod.image;
      } else {
        this.dom.prodImgPreview.innerHTML = `<i class="material-icons" style="font-size:24px; color:var(--text-muted);">image</i>`;
        delete this.dom.prodImgPreview.dataset.base64;
      }
    } else {
      document.getElementById('prod-modal-title').innerText = "Add New Product";
      this.dom.productForm.reset();
      this.dom.prodId.value = '';
      this.dom.prodImgPreview.innerHTML = `<i class="material-icons" style="font-size:24px; color:var(--text-muted);">image</i>`;
      delete this.dom.prodImgPreview.dataset.base64;
    }

    this.dom.productModal.classList.add('active');
  }

  async handleProductSubmit(e) {
    e.preventDefault();
    
    const id = this.dom.prodId.value;
    const item = {
      name: this.dom.prodName.value.trim(),
      category: this.dom.prodCategory.value,
      costPrice: parseFloat(this.dom.prodCost.value) || 0,
      price: parseFloat(this.dom.prodPrice.value) || 0,
      status: this.dom.prodStatus.value,
      popular: this.dom.prodPopular.checked,
      image: this.dom.prodImgPreview.dataset.base64 || ''
    };

    try {
      if (id) {
        // Edit mode
        await db.update('products', id, item);
        toast.success(`Successfully saved: ${item.name}`, "Product Modified");
      } else {
        // Create mode
        await db.add('products', item);
        toast.success(`Successfully added: ${item.name}`, "Product Created");
      }
      
      this.dom.productModal.classList.remove('active');
      this.loadData();
    } catch (err) {
      toast.error(err.message, "Form Saving Failure");
    }
  }

  async deleteProduct(id, name) {
    if (confirm(`Are you sure you want to delete ${name} from catalog?`)) {
      try {
        await db.delete('products', id);
        toast.success(`${name} deleted.`, "Product Removed");
        this.loadData();
      } catch (err) {
        toast.error(err.message, "Failed to Delete Product");
      }
    }
  }

  // MODAL - Open Category
  openCategoryModal(cat = null) {
    this.editingCategory = cat;
    
    if (cat) {
      document.getElementById('cat-modal-title').innerText = "Edit Category Name";
      this.dom.catId.value = cat.id;
      this.dom.catName.value = cat.name;
    } else {
      document.getElementById('cat-modal-title').innerText = "Create New Category";
      this.dom.categoryForm.reset();
      this.dom.catId.value = '';
    }

    this.dom.categoryModal.classList.add('active');
  }

  async handleCategorySubmit(e) {
    e.preventDefault();
    
    const id = this.dom.catId.value;
    const name = this.dom.catName.value.trim();
    
    const duplicate = this.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id);
    if (duplicate) {
      toast.warning(`Category "${name}" already exists.`, "Duplicate Name");
      return;
    }

    try {
      if (id) {
        await db.update('categories', id, { name: name });
        toast.success(`Renamed category to ${name}`, "Category Updated");
      } else {
        await db.add('categories', { name: name, status: 'active' });
        toast.success(`Category ${name} created.`, "Category Saved");
      }
      this.dom.categoryModal.classList.remove('active');
      this.loadData();
    } catch (err) {
      toast.error(err.message, "Saving Failure");
    }
  }

  async deleteCategory(id, name) {
    // Check if category has products inside
    const hasProducts = this.products.some(p => p.category === name);
    if (hasProducts) {
      toast.error(`Cannot delete category. Move or delete its products first.`, "Category Not Empty");
      return;
    }

    if (confirm(`Are you sure you want to delete the category "${name}"?`)) {
      try {
        await db.delete('categories', id);
        toast.success(`Category ${name} deleted.`, "Category Removed");
        this.loadData();
      } catch (err) {
        toast.error(err.message, "Failed to Remove");
      }
    }
  }
}

export const products = new ProductManager();
