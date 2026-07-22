import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, push, set, update, get } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';
import { calculateRequiredActualQuantity, calculateOperationDuration } from '../utils/scheduling.js';

// Material Design 3 Imports
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/icon/icon.js';

interface ProductPart {
  name: string;
  sku: string;
  dependency: string;
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
  part?: ProductPart[];
}

interface CustomerItem {
  $key: string;
  name: string;
  email: string;
}

@customElement('view-plan-order')
export class ViewPlanOrder extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .order-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }
    .order-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 12px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .date-input-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .date-label {
      font-size: 0.8rem;
      color: #666;
      font-weight: 500;
    }
    .date-input {
      height: 56px;
      border: 1px solid #79747e;
      border-radius: 4px;
      padding: 0 16px;
      font-size: 1rem;
      font-family: 'Roboto', sans-serif;
      box-sizing: border-box;
      outline: none;
    }
    .date-input:focus {
      border: 2px solid #202020;
    }

    /* Ledger run detail group */
    .ledger-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ledger-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.95rem;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(0,0,0,0.04);
    }
    .ledger-label {
      color: #666666;
    }
    .ledger-value {
      font-weight: 500;
      color: #202020;
      text-align: right;
    }

    /* Fragment cards */
    .fragmentation-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .fragment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .fragment-badge {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 8px;
      padding: 16px;
      background-color: #fafafa;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fragment-title {
      font-size: 0.95rem;
      font-weight: 500;
      margin: 0 0 4px 0;
      color: #202020;
    }
    .fragment-meta {
      font-size: 0.85rem;
      color: #555;
    }

    .btn-row {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  // Active form field states
  @state() private selectedCustomerKey = '';
  @state() private selectedProductKey = '';
  @state() private orderQuantity = 1;
  @state() private deliveryDate = '';

  // Order count increment index
  @state() private nextOrderNo = 1;

  // Real-time Queries
  private customerController = new FirebaseQueryController<CustomerItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/customer` : null
  );

  private productController = new FirebaseQueryController<ProductItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/product` : null
  );

  private orderIndexController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/order` : null
  );

  private performanceController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/performance` : null
  );

  private appDataController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/appData` : null
  );

  override connectedCallback() {
    super.connectedCallback();
    const today = new Date();
    let dd = today.getDate().toString();
    let mm = (today.getMonth() + 1).toString();
    const yyyy = today.getFullYear();
    if (Number(dd) < 10) dd = '0' + dd;
    if (Number(mm) < 10) mm = '0' + mm;
    this.deliveryDate = `${yyyy}-${mm}-${dd}`;
  }

  override updated() {
    if (this.orderIndexController.data && !this.orderIndexController.loading) {
      const idx = this.orderIndexController.data.order_count || 1;
      this.nextOrderNo = idx;
    }
  }

  private getSelectedCustomer() {
    return this.customerController.data.find(c => c.$key === this.selectedCustomerKey);
  }

  private getSelectedProduct() {
    return this.productController.data.find(p => p.$key === this.selectedProductKey);
  }

  private getSumSetupTime(setup: number[]) {
    if (!setup || setup.length === 0) return 0;
    return setup.reduce((a, b) => a + b, 0);
  }

  private getSumCycleTime(cycle: number[]) {
    if (!cycle || cycle.length === 0) return 0;
    return cycle.reduce((a, b) => a + b, 0);
  }

  private formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }

  private async submitOrder() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    const customer = this.getSelectedCustomer();
    const product = this.getSelectedProduct();

    if (!customer || !product || !this.deliveryDate || this.orderQuantity <= 0) {
      alert('Please fill in the order booking form completely with valid quantities.');
      return;
    }

    // Verify product processes fit current layout concurrency limitations
    const wasteRatio = this.performanceController.data?.aw || 0;
    const actualQty = calculateRequiredActualQuantity(this.orderQuantity, wasteRatio);

    // Calculate aggregated run durations across parts
    let totalDurationSeconds = 0;
    product.part?.forEach(part => {
      const setup = this.getSumSetupTime(part.setup);
      const cycle = this.getSumCycleTime(part.cycle);
      totalDurationSeconds += calculateOperationDuration(setup, cycle, actualQty);
    });

    const timestamp = Math.round(Date.now() / 1000);
    const deliveryTimestamp = Math.round(new Date(this.deliveryDate).getTime() / 1000);

    const orderPayload = {
      order_date: timestamp,
      order_no: this.nextOrderNo,
      order_customer: customer.name,
      order_product_name: product.name,
      order_product_description: product.description || '',
      order_product_part: product.part || [],
      order_product_sku: product.sku,
      order_quantity: actualQty,
      order_duration: totalDurationSeconds,
      order_delivery: deliveryTimestamp,
      order_status: 'waiting',
      order_color: product.color || '#202020'
    };

    try {
      // 1. Write order details to the active booking queue
      const ordersRef = dbRef(db, `/data/${companyKey}/orderData`);
      const newOrderRef = push(ordersRef);
      await set(newOrderRef, orderPayload);

      // 2. Log order to historical archives
      const historyRef = push(dbRef(db, `/data/${companyKey}/historyData/order`));
      await set(historyRef, {
        order_date: timestamp,
        order_delivery: deliveryTimestamp,
        order_no: this.nextOrderNo,
        order_customer: customer.name,
        order_product: product.name,
        order_quantity: actualQty,
        product_color: product.color || '#202020'
      });

      // 3. Deduct raw materials if calculation is toggled true
      const materialCalculationToggled = this.appDataController.data?.material_count;
      if (materialCalculationToggled && product.inventory_code && product.inventory_use) {
        const materialCode = product.inventory_code;
        const requiredAmount = actualQty * parseFloat(product.inventory_use);
        
        // Query current inventory stock amount
        const inventoryRef = dbRef(db, `/data/${companyKey}/factoryData/inventory`);
        const snapshot = await get(inventoryRef);
        if (snapshot.exists()) {
          const invList = snapshot.val();
          const targetKey = Object.keys(invList).find(k => invList[k].code === materialCode);
          if (targetKey) {
            const originalQty = parseFloat(invList[targetKey].quantity) || 0;
            const updatedQty = Math.max(0, originalQty - requiredAmount);
            await update(dbRef(db, `/data/${companyKey}/factoryData/inventory/${targetKey}`), {
              quantity: updatedQty
            });

            // Write warning if raw stock is empty
            if (originalQty < requiredAmount) {
              const notificationsRef = push(dbRef(db, `/data/${companyKey}/notificationData`));
              await set(notificationsRef, {
                created: timestamp,
                detail: `Inventory item ${materialCode} is out of stock! Needed ${requiredAmount}, had ${originalQty}.`,
                type: 'critical'
              });
            }
          }
        }
      }

      // 4. Update overall order indexing count
      await set(dbRef(db, `/data/${companyKey}/factoryData/order/order_count`), this.nextOrderNo + 1);

      // 5. System alert
      const notificationsRef = push(dbRef(db, `/data/${companyKey}/notificationData`));
      await set(notificationsRef, {
        created: timestamp,
        detail: `Successfully booked order No. ${this.nextOrderNo} for ${customer.name}`,
        type: 'normal'
      });

      alert(`Successfully booked order No. ${this.nextOrderNo}! Added to scheduling waiting list.`);
      
      // Reset form
      this.selectedCustomerKey = '';
      this.selectedProductKey = '';
      this.orderQuantity = 1;
    } catch (err: any) {
      console.error('Error submitting order', err);
    }
  }

  override render() {
    if (this.customerController.loading || this.productController.loading) {
      return html`<p>Loading sales and parts databases...</p>`;
    }

    const customers = this.customerController.data;
    const products = this.productController.data;

    const selectedProduct = this.getSelectedProduct();
    const wasteRatio = this.performanceController.data?.aw || 0;
    const actualQty = calculateRequiredActualQuantity(this.orderQuantity, wasteRatio);

    // Calculate dynamic duration estimates
    let totalDurationSeconds = 0;
    selectedProduct?.part?.forEach(part => {
      const setup = this.getSumSetupTime(part.setup);
      const cycle = this.getSumCycleTime(part.cycle);
      totalDurationSeconds += calculateOperationDuration(setup, cycle, actualQty);
    });

    const totalCost = selectedProduct ? parseFloat(selectedProduct.cost) * actualQty : 0;

    return html`
      <div class="order-grid">
        <!-- 1. Form Card -->
        <div class="order-card">
          <h3 class="card-title">Book Sales Order</h3>
          
          <div class="form-group">
            <md-outlined-select 
              label="Select Customer" 
              .value=${this.selectedCustomerKey}
              @change=${(e: any) => this.selectedCustomerKey = e.target.value}>
              ${customers.map(c => html`
                <md-select-option value=${c.$key}>
                  <div slot="headline">${c.name}</div>
                </md-select-option>
              `)}
            </md-outlined-select>

            <md-outlined-select 
              label="Select Product SKU" 
              .value=${this.selectedProductKey}
              @change=${(e: any) => this.selectedProductKey = e.target.value}>
              ${products.map(p => html`
                <md-select-option value=${p.$key}>
                  <div slot="headline">${p.name} (SKU: ${p.sku})</div>
                </md-select-option>
              `)}
            </md-outlined-select>

            <md-outlined-text-field 
              label="Quantity" 
              type="number" 
              min="1"
              .value=${this.orderQuantity.toString()}
              @input=${(e: any) => this.orderQuantity = Number(e.target.value)}>
            </md-outlined-text-field>

            <div class="date-input-container">
              <label class="date-label">Requested Delivery Date</label>
              <input 
                type="date" 
                class="date-input"
                .value=${this.deliveryDate}
                @input=${(e: any) => this.deliveryDate = e.target.value}/>
            </div>
          </div>

          <div class="btn-row">
            <md-filled-button @click=${this.submitOrder}>
              <md-icon slot="icon">calendar_today</md-icon> Book Order to Waitlist
            </md-filled-button>
          </div>
        </div>

        <!-- 2. Detailed Ledger Summary -->
        <div class="order-card">
          <h3 class="card-title">Calculated Estimation Ledger</h3>
          
          <div class="ledger-list">
            <div class="ledger-row">
              <span class="ledger-label">Next Order Sequence</span>
              <span class="ledger-value">#${this.nextOrderNo}</span>
            </div>

            <div class="ledger-row">
              <span class="ledger-label">Selected Customer</span>
              <span class="ledger-value">${this.getSelectedCustomer()?.name || 'N/A'}</span>
            </div>

            <div class="ledger-row">
              <span class="ledger-label">Product SKU</span>
              <span class="ledger-value">${selectedProduct?.sku || 'N/A'}</span>
            </div>

            <div class="ledger-row">
              <span class="ledger-label">Target Quantity</span>
              <span class="ledger-value">${this.orderQuantity} units</span>
            </div>

            <div class="ledger-row">
              <span class="ledger-label">Calculated Actual Quantity</span>
              <span class="ledger-value">${actualQty} units <span style="font-size:0.75rem; color:#d32f2f;">(incl. ${wasteRatio * 100}% waste yield)</span></span>
            </div>

            <div class="ledger-row">
              <span class="ledger-label">Raw Material Requirement</span>
              <span class="ledger-value">
                ${selectedProduct?.inventory_code ? html`
                  <code>${selectedProduct.inventory_code}</code> (${actualQty * parseFloat(selectedProduct.inventory_use)} units required)
                ` : 'N/A'}
              </span>
            </div>

            <div class="ledger-row">
              <span class="ledger-label">Estimated Processing Duration</span>
              <span class="ledger-value">${selectedProduct ? this.formatDuration(totalDurationSeconds) : 'N/A'}</span>
            </div>

            <div class="ledger-row">
              <span class="ledger-label">Due Date</span>
              <span class="ledger-value">${this.deliveryDate}</span>
            </div>

            <div class="ledger-row" style="border-bottom:none; margin-top: 12px;">
              <span class="ledger-label" style="font-size:1.1rem; font-weight:500; color:#202020;">Estimated Cost</span>
              <span class="ledger-value" style="font-size:1.4rem; font-weight:700; color:#2e7d32;">$${totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Product Fragmentation -->
      ${selectedProduct ? html`
        <div class="fragmentation-card">
          <h3 class="card-title">Product Assembly Fragmentation Routing</h3>
          <p style="font-size:0.85rem; color:#666; margin:0; line-height:1.4;">Below represents the parts and sequential workstations this product must pass through during shopfloor execution:</p>
          
          <div class="fragment-grid">
            ${selectedProduct.part?.map(part => html`
              <div class="fragment-badge">
                <h4 class="fragment-title">Part: ${part.name}</h4>
                <div class="fragment-meta"><strong>SKU:</strong> ${part.sku}</div>
                <div class="fragment-meta"><strong>Workstation Routing:</strong> ${part.process ? part.process.join(' → ') : 'N/A'}</div>
                <div class="fragment-meta"><strong>Total Setup Time:</strong> ${this.getSumSetupTime(part.setup)} seconds</div>
                <div class="fragment-meta"><strong>Total Cycle Time:</strong> ${this.getSumCycleTime(part.cycle)} seconds</div>
              </div>
            `)}
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-plan-order': ViewPlanOrder;
  }
}
