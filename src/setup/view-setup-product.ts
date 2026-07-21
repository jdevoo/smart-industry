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
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

interface ProductPart {
  name: string;
  sku: string;
  dependency: string;
  // In Firebase, we map process[], cycle[], and setup[] arrays as flat sequences:
  process: number[];
  cycle: number[];
  setup: number[];
}

interface ProductItem {
  $key: string;
  name: string;
  sku: string;
  description: string;
  color: string;
  cost: string;
  inventory_code: string;
  inventory_use: string;
  part: ProductPart[];
}

interface StationItem {
  $key: string;
  st_name: string;
  st_number: number;
}

@customElement('view-setup-product')
export class ViewSetupProduct extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .product-workspace {
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

    /* Product Cards Grid */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .product-card {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 16px;
      border-top: 5px solid #202020;
    }
    .product-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .product-title {
      font-weight: 500;
      font-size: 1.15rem;
      margin: 0;
      color: #202020;
    }
    .product-meta {
      font-size: 0.8rem;
      color: #666;
      margin-top: 2px;
    }
    .parts-indicator {
      font-size: 0.85rem;
      background-color: #f5f5f5;
      padding: 8px 12px;
      border-radius: 6px;
      font-weight: 500;
    }
    .part-summary-item {
      font-size: 0.8rem;
      color: #444;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    .product-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: auto;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 12px;
    }

    /* Advanced Multi-step Dialog Editor */
    .editor-overlay {
      position: fixed;
      top: 0; right: 0; bottom: 0; left: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .editor-dialog {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 640px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .editor-dialog h4 {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0;
    }
    .editor-section {
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 16px;
      background-color: #fafafa;
    }
    .section-title {
      font-weight: 500;
      font-size: 0.95rem;
      margin-bottom: 12px;
      color: #202020;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    /* Parts Builder Styling */
    .part-editor-card {
      background-color: #ffffff;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .steps-container {
      border-top: 1px dashed rgba(0,0,0,0.1);
      padding-top: 12px;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .step-editor-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr auto;
      gap: 8px;
      align-items: center;
    }
    
    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 16px;
      margin-top: 12px;
    }
    md-outlined-text-field, md-outlined-select {
      width: 100%;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private showEditor = false;
  @state() private editingKey: string | null = null;

  // Editor Parent Fields
  @state() private editName = '';
  @state() private editSku = '';
  @state() private editDescription = '';
  @state() private editColor = '#1e88e5';
  @state() private editCost = '';
  @state() private editInventoryCode = '';
  @state() private editInventoryUse = '';

  // Editor Child Parts list
  @state() private editParts: ProductPart[] = [];

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

  // Controllers
  private productsController = new FirebaseQueryController<ProductItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/product` : null
  );

  private stationsController = new FirebaseQueryController<StationItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/station` : null
  );

  private openAddDialog() {
    this.editingKey = null;
    this.editName = '';
    this.editSku = '';
    this.editDescription = '';
    this.editColor = '#1e88e5';
    this.editCost = '';
    this.editInventoryCode = '';
    this.editInventoryUse = '';
    this.editParts = [];
    this.showEditor = true;
  }

  private openEditDialog(product: ProductItem) {
    this.editingKey = product.$key;
    this.editName = product.name || '';
    this.editSku = product.sku || '';
    this.editDescription = product.description || '';
    this.editColor = product.color || '#1e88e5';
    this.editCost = product.cost || '';
    this.editInventoryCode = product.inventory_code || '';
    this.editInventoryUse = product.inventory_use || '';
    this.editParts = product.part ? JSON.parse(JSON.stringify(product.part)) : [];
    this.showEditor = true;
  }

  private async deleteProduct(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to delete this product? All routing steps and part configurations inside it will be removed.')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/factoryData/product/${key}`));
      } catch (err) {
        console.error('Failed to remove product', err);
      }
    }
  }

  private addPartToDraft() {
    this.editParts = [...this.editParts, {
      name: 'New Part',
      sku: '',
      dependency: '',
      process: [],
      cycle: [],
      setup: []
    }];
  }

  private removePartFromDraft(index: number) {
    this.editParts = this.editParts.filter((_, i) => i !== index);
  }

  private addStepToPart(partIndex: number) {
    const part = this.editParts[partIndex];
    part.process = [...part.process, this.stationsController.data[0]?.st_number || 1];
    part.cycle = [...part.cycle, 60];
    part.setup = [...part.setup, 120];
    this.requestUpdate();
  }

  private removeStepFromPart(partIndex: number, stepIndex: number) {
    const part = this.editParts[partIndex];
    part.process = part.process.filter((_, i) => i !== stepIndex);
    part.cycle = part.cycle.filter((_, i) => i !== stepIndex);
    part.setup = part.setup.filter((_, i) => i !== stepIndex);
    this.requestUpdate();
  }

  private async saveProduct() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (!this.editName || !this.editSku) {
      alert('Product Name and SKU are required fields');
      return;
    }

    const payload = {
      name: this.editName,
      sku: this.editSku,
      description: this.editDescription,
      color: this.editColor,
      cost: this.editCost,
      inventory_code: this.editInventoryCode,
      inventory_use: this.editInventoryUse,
      part: this.editParts
    };

    try {
      if (this.editingKey) {
        await update(dbRef(db, `/data/${companyKey}/factoryData/product/${this.editingKey}`), payload);
      } else {
        const newRef = push(dbRef(db, `/data/${companyKey}/factoryData/product`));
        await set(newRef, payload);
      }
      this.showEditor = false;
    } catch (err) {
      console.error('Error saving product configuration', err);
    }
  }

  override render() {
    if (this.productsController.loading || this.stationsController.loading) {
      return html`<p>Loading Products & Assemblies...</p>`;
    }

    const products = this.productsController.data;
    const stations = this.stationsController.data;

    return html`
      <div class="product-workspace">
        <div class="header-bar">
          <h3>Product & Part Sequences</h3>
          <md-filled-button @click=${this.openAddDialog}>
            <md-icon slot="icon">add</md-icon>
            Configure Product
          </md-filled-button>
        </div>

        ${products.length === 0 ? html`
          <p>No products configured. Click 'Configure Product' to define your parts and station routing.</p>
        ` : html`
          <div class="product-grid">
            ${products.map(product => html`
              <div class="product-card" style="border-top: 5px solid ${product.color}">
                <div class="product-header">
                  <div>
                    <h4 class="product-title">${product.name}</h4>
                    <p class="product-meta">Main SKU: ${product.sku}</p>
                  </div>
                </div>

                <div class="parts-indicator">
                  <span>Parts Assembly Count: ${product.part ? product.part.length : 0}</span>
                  ${product.part?.map(p => html`
                    <div class="part-summary-item">
                      <md-icon style="font-size:12px; width:12px; height:12px;">subdirectory_arrow_right</md-icon>
                      <span><strong>${p.name}</strong> (${p.sku || 'No SKU'}) - Routing steps: ${p.process ? p.process.length : 0}</span>
                    </div>
                  `)}
                </div>

                <div class="product-actions">
                  <md-icon-button @click=${() => this.openEditDialog(product)}>
                    <md-icon>edit</md-icon>
                  </md-icon-button>
                  <md-icon-button @click=${() => this.deleteProduct(product.$key)}>
                    <md-icon>delete</md-icon>
                  </md-icon-button>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>

      <!-- Sophisticated Product Builder Dialog -->
      ${this.showEditor ? html`
        <div class="editor-overlay">
          <div class="editor-dialog">
            <h4>${this.editingKey ? 'Modify Product Sequence Layout' : 'Configure New Product Sequence'}</h4>

            <!-- Parent product specs -->
            <div class="editor-section">
              <h5 class="section-title">Product Specifications</h5>
              <div class="form-group">
                <div class="form-row">
                  <md-outlined-text-field label="Product Name" .value=${this.editName} @input=${(e: any) => this.editName = e.target.value}></md-outlined-text-field>
                  <md-outlined-text-field label="Main SKU" .value=${this.editSku} @input=${(e: any) => this.editSku = e.target.value}></md-outlined-text-field>
                </div>
                <div class="form-row">
                  <md-outlined-text-field label="Description" .value=${this.editDescription} @input=${(e: any) => this.editDescription = e.target.value}></md-outlined-text-field>
                  <md-outlined-text-field label="Product Cost" type="number" .value=${this.editCost} @input=${(e: any) => this.editCost = e.target.value}></md-outlined-text-field>
                </div>
                <div class="form-row" style="grid-template-columns: 1fr 1.5fr 1.5fr;">
                  <div style="display:flex; flex-direction:column; gap:4px; font-size:0.85rem;">
                    <label>Color Theme</label>
                    <input type="color" .value=${this.editColor} @input=${(e: any) => this.editColor = e.target.value} style="width:100%; height:40px; border-radius:4px; border:1px solid rgba(0,0,0,0.1); cursor:pointer;"/>
                  </div>
                  <md-outlined-text-field label="Inventory Code" .value=${this.editInventoryCode} @input=${(e: any) => this.editInventoryCode = e.target.value}></md-outlined-text-field>
                  <md-outlined-text-field label="Inventory Use Qty" type="number" .value=${this.editInventoryUse} @input=${(e: any) => this.editInventoryUse = e.target.value}></md-outlined-text-field>
                </div>
              </div>
            </div>

            <!-- Parts Sequence Builder -->
            <div class="editor-section">
              <div class="section-title">
                <span>Parts & Sequence Routing</span>
                <md-outlined-button style="--md-outlined-button-container-shape: 4px;" @click=${this.addPartToDraft}>
                  <md-icon slot="icon">add</md-icon>Add Part
                </md-outlined-button>
              </div>

              ${this.editParts.map((part, partIdx) => html`
                <div class="part-editor-card">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size: 0.95rem; color:#202020;">Part #${partIdx + 1}</strong>
                    <md-icon-button @click=${() => this.removePartFromDraft(partIdx)}>
                      <md-icon style="font-size:18px;">delete</md-icon>
                    </md-icon-button>
                  </div>

                  <div class="form-row">
                    <md-outlined-text-field label="Part Name" .value=${part.name} @input=${(e: any) => { part.name = e.target.value; this.requestUpdate(); }}></md-outlined-text-field>
                    <md-outlined-text-field label="Part SKU" .value=${part.sku} @input=${(e: any) => { part.sku = e.target.value; this.requestUpdate(); }}></md-outlined-text-field>
                  </div>
                  <md-outlined-text-field label="Pre-requisite (Dependency Part SKU)" .value=${part.dependency} @input=${(e: any) => { part.dependency = e.target.value; this.requestUpdate(); }}></md-outlined-text-field>

                  <!-- Steps List nested inside each Part -->
                  <div class="steps-container">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                      <span style="font-size: 0.85rem; font-weight:500; color:#555;">Assembly Process Steps:</span>
                      <md-outlined-button @click=${() => this.addStepToPart(partIdx)} style="--md-outlined-button-container-shape: 4px; --md-outlined-button-label-text-size: 11px; height: 32px;">
                        Add Step
                      </md-outlined-button>
                    </div>

                    ${part.process.map((stationNum, stepIdx) => html`
                      <div class="step-editor-row">
                        <!-- Select workstation number -->
                        <md-outlined-select 
                          label="Workstation" 
                          .value=${stationNum.toString()} 
                          style="height: 48px;"
                          @change=${(e: any) => { part.process[stepIdx] = Number(e.target.value); this.requestUpdate(); }}>
                          ${stations.map(st => html`
                            <md-select-option value=${st.st_number.toString()}>
                              <div slot="headline">ST-${st.st_number} - ${st.st_name}</div>
                            </md-select-option>
                          `)}
                        </md-outlined-select>

                        <md-outlined-text-field 
                          label="Cycle (s)" 
                          type="number" 
                          .value=${part.cycle[stepIdx].toString()}
                          @input=${(e: any) => { part.cycle[stepIdx] = Number(e.target.value); this.requestUpdate(); }}>
                        </md-outlined-text-field>

                        <md-outlined-text-field 
                          label="Setup (s)" 
                          type="number" 
                          .value=${part.setup[stepIdx].toString()}
                          @input=${(e: any) => { part.setup[stepIdx] = Number(e.target.value); this.requestUpdate(); }}>
                        </md-outlined-text-field>

                        <md-icon-button @click=${() => this.removeStepFromPart(partIdx, stepIdx)}>
                          <md-icon style="font-size:16px;">close</md-icon>
                        </md-icon-button>
                      </div>
                    `)}
                  </div>
                </div>
              `)}
            </div>

            <div class="editor-actions">
              <md-outlined-button @click=${() => this.showEditor = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.saveProduct}>Save Product</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-setup-product': ViewSetupProduct;
  }
}
