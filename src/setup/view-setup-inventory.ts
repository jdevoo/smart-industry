import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, push, set, remove, update } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';

// Material Design 3 UI Imports
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';

interface InventoryItem {
  $key: string;
  name: string;
  code: string;
  cost: number;
  quantity: number;
  add: number;
  update: number;
}

@customElement('view-setup-inventory')
export class ViewSetupInventory extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .inventory-workspace {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      padding-bottom: 16px;
    }
    .header-bar h3 {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
    }

    /* Grid layout */
    .inventory-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .inventory-card {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .inventory-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border-color: rgba(0,0,0,0.15);
    }
    .inventory-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .inventory-title {
      font-weight: 500;
      font-size: 1.1rem;
      margin: 0;
      color: #202020;
    }
    .inventory-code {
      font-size: 0.8rem;
      color: #666;
      margin-top: 2px;
      font-family: monospace;
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    /* Stock levels indicator */
    .stock-indicator-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 20px;
      width: fit-content;
    }
    .badge-in-stock {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .badge-low-stock {
      background-color: #fff3e0;
      color: #ef6c00;
    }
    .badge-out-of-stock {
      background-color: #ffebee;
      color: #c62828;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot-in-stock { background-color: #2e7d32; }
    .dot-low-stock { background-color: #ef6c00; }
    .dot-out-of-stock { background-color: #c62828; }

    .inventory-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
      color: #444;
      background-color: #fafafa;
      padding: 10px;
      border-radius: 8px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
    }
    .detail-label {
      color: #666;
    }
    .detail-val {
      font-weight: 500;
    }

    .inventory-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
      border-top: 1px solid rgba(0,0,0,0.04);
      padding-top: 8px;
    }

    /* Modal Form Styling */
    .editor-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .editor-dialog {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 440px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .editor-dialog h4 {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 16px;
    }
    md-outlined-text-field {
      width: 100%;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private showEditor = false;
  @state() private editingKey: string | null = null; // null = Add, string = Edit

  // Form Fields
  @state() private editName = '';
  @state() private editCode = '';
  @state() private editCost = 0.00;
  @state() private editQuantity = 0;

  private _boundEscHandler = this._handleEscKey.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._boundEscHandler);
  }

  override disconnectedCallback() {
    window.removeEventListener('keydown', this._boundEscHandler);
    super.disconnectedCallback();
  }

  private _handleEscKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.showEditor) {
      this.showEditor = false;
    }
  }

  // Real-time Queries
  private inventoryController = new FirebaseQueryController<InventoryItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/inventory` : null
  );

  private openAddDialog() {
    this.editingKey = null;
    this.editName = '';
    this.editCode = '';
    this.editCost = 0.00;
    this.editQuantity = 0;
    this.showEditor = true;
  }

  private openEditDialog(item: InventoryItem) {
    this.editingKey = item.$key;
    this.editName = item.name || '';
    this.editCode = item.code || '';
    this.editCost = item.cost || 0.00;
    this.editQuantity = item.quantity || 0;
    this.showEditor = true;
  }

  private async deleteInventoryItem(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to delete this stock/raw-material inventory item?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/factoryData/inventory/${key}`));
      } catch (err) {
        console.error('Failed to remove inventory item', err);
      }
    }
  }

  private async saveInventoryItem() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (!this.editName.trim() || !this.editCode.trim()) {
      alert('Material/Item Name and Part Code/SKU are required fields.');
      return;
    }

    const timestamp = Math.round(Date.now() / 1000);

    const payload = {
      name: this.editName.trim(),
      code: this.editCode.trim(),
      cost: Number(this.editCost),
      quantity: Number(this.editQuantity),
      update: timestamp
    };

    try {
      if (this.editingKey) {
        // Edit Mode
        await update(dbRef(db, `/data/${companyKey}/factoryData/inventory/${this.editingKey}`), payload);
      } else {
        // Add Mode
        const newRef = push(dbRef(db, `/data/${companyKey}/factoryData/inventory`));
        await set(newRef, {
          ...payload,
          add: timestamp
        });
      }

      // Safe stock limit monitoring notification push
      const quantityNum = Number(this.editQuantity);
      if (quantityNum <= 0) {
        // Critical Alert
        const alertRef = push(dbRef(db, `/data/${companyKey}/notificationData`));
        await set(alertRef, {
          created: timestamp,
          detail: `Critical stock alarm: Inventory code "${payload.code}" is completely out of stock.`,
          type: 'critical'
        });
      } else if (quantityNum < 30) {
        // Low Stock Alert
        const alertRef = push(dbRef(db, `/data/${companyKey}/notificationData`));
        await set(alertRef, {
          created: timestamp,
          detail: `Stock warning: Inventory code "${payload.code}" is running low (${quantityNum} units remaining).`,
          type: 'warn'
        });
      }

      this.showEditor = false;
    } catch (err) {
      console.error('Failed to save inventory item', err);
    }
  }

  override render() {
    if (this.inventoryController.loading) {
      return html`<p>Loading Inventory Ledger...</p>`;
    }

    const items = this.inventoryController.data;

    return html`
      <div class="inventory-workspace">
        <div class="header-bar">
          <h3>Raw Materials & Stock Inventory</h3>
          <md-filled-button @click=${this.openAddDialog}>
            <md-icon slot="icon">add</md-icon>
            Add Material
          </md-filled-button>
        </div>

        ${items.length === 0 ? html`
          <p>No inventory listings configured inside this facility. Populate stock to automatically manage limits and trigger alarms.</p>
        ` : html`
          <div class="inventory-grid">
            ${items.map(item => {
              const qty = item.quantity || 0;
              let stockClass = 'badge-in-stock';
              let dotClass = 'dot-in-stock';
              let stockText = 'In Stock';
              
              if (qty === 0) {
                stockClass = 'badge-out-of-stock';
                dotClass = 'dot-out-of-stock';
                stockText = 'Out of Stock';
              } else if (qty < 30) {
                stockClass = 'badge-low-stock';
                dotClass = 'dot-low-stock';
                stockText = 'Low Stock';
              }

              return html`
                <div class="inventory-card">
                  <div class="inventory-header">
                    <div>
                      <h4 class="inventory-title">${item.name}</h4>
                      <span class="inventory-code">${item.code}</span>
                    </div>
                    <div class="stock-indicator-badge ${stockClass}">
                      <span class="dot ${dotClass}"></span>
                      <span>${stockText}</span>
                    </div>
                  </div>

                  <div class="inventory-details">
                    <div class="detail-row">
                      <span class="detail-label">Quantity Available:</span>
                      <span class="detail-val" style="color: ${qty === 0 ? '#c62828' : qty < 30 ? '#ef6c00' : '#2e7d32'}">${qty} units</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Standard Unit Cost:</span>
                      <span class="detail-val">$${Number(item.cost || 0).toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Standard Inventory Valuation:</span>
                      <span class="detail-val">$${Number((item.cost || 0) * qty).toFixed(2)}</span>
                    </div>
                  </div>

                  <div class="inventory-actions">
                    <md-icon-button @click=${() => this.openEditDialog(item)}>
                      <md-icon>edit</md-icon>
                    </md-icon-button>
                    <md-icon-button @click=${() => this.deleteInventoryItem(item.$key)}>
                      <md-icon>delete</md-icon>
                    </md-icon-button>
                  </div>
                </div>
              `;
            })}
          </div>
        `}
      </div>

      <!-- Overlay Dialog -->
      ${this.showEditor ? html`
        <div class="editor-overlay">
          <div class="editor-dialog">
            <h4>${this.editingKey ? 'Modify Material Listing' : 'Introduce New Inventory Material'}</h4>

            <div class="form-group">
              <md-outlined-text-field 
                label="Material / Part Name" 
                .value=${this.editName}
                @input=${(e: any) => this.editName = e.target.value}
                required>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Part Code / SKU" 
                .value=${this.editCode}
                @input=${(e: any) => this.editCode = e.target.value}
                required>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Standard Cost per Unit ($)" 
                type="number"
                step="0.01"
                .value=${this.editCost.toString()}
                @input=${(e: any) => this.editCost = Number(e.target.value)}>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Current Stock Quantity" 
                type="number"
                .value=${this.editQuantity.toString()}
                @input=${(e: any) => this.editQuantity = Number(e.target.value)}>
              </md-outlined-text-field>
            </div>

            <div class="editor-actions">
              <md-outlined-button @click=${() => this.showEditor = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.saveInventoryItem}>Save Stock Item</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-setup-inventory': ViewSetupInventory;
  }
}
