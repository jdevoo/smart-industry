import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, remove } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';
import { displayDateFromTimestamp } from '../utils/date.js';
import { columnBodyRenderer, columnHeaderRenderer } from '@vaadin/grid/lit.js';

// Material Design 3 Imports
import '@material/web/button/filled-button.js';
import '@material/web/icon/icon.js';
import '@vaadin/grid/vaadin-grid.js';

interface CompletedOrderArchiveItem {
  $key: string;
  order_no: number;
  order_customer: string;
  order_product: string;
  order_quantity: number;
  order_delivery: number; // timestamp
  order_date: number; // timestamp
  product_color: string;
  actual_start?: number;
  actual_end?: number;
}

@customElement('view-track-warehouse')
export class ViewTrackWarehouse extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .warehouse-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .ledger-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
    }
    .action-row {
      display: flex;
      justify-content: center;
      margin-top: 24px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  private warehouseQueryController = new FirebaseQueryController<CompletedOrderArchiveItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/warehouseData` : null
  );

  private async clearWarehouse() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to permanently clear the completed warehouse records? All archived statistics will be deleted.')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/warehouseData`));
        alert('Warehouse archived records cleared successfully.');
      } catch (err) {
        console.error('Failed to clear warehouse', err);
      }
    }
  }

  private async deleteWarehouseOrder(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to remove this archived order from the warehouse?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/warehouseData/${key}`));
      } catch (err) {
        console.error('Failed to delete archived order', err);
      }
    }
  }

  // Formatting helpers for Vaadin Grid columns
  getFormattedDate(timestamp: number): string {
    if (!timestamp) return 'N/A';
    return displayDateFromTimestamp(timestamp * 1000);
  }

  formatTimeDifference(start?: number, end?: number): string {
    if (!start || !end) return 'N/A';
    const seconds = end - start;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }

  override render() {
    if (this.warehouseQueryController.loading) {
      return html`<p>Retrieving completed warehouse ledger archives...</p>`;
    }

    const archivedOrders = this.warehouseQueryController.data;

    return html`
      <div class="warehouse-container">
        <div class="ledger-card">
          <div class="card-header">
            <h3 class="card-title">Completed Orders Warehouse Inventory</h3>
          </div>

          <vaadin-grid .items=${archivedOrders} style="height: 440px;">
            <vaadin-grid-column
              flex="0.5"
              ${columnHeaderRenderer(() => html`Order No`, [])}
              ${columnBodyRenderer((item: any) => html`#${item.order_no}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.5"
              ${columnHeaderRenderer(() => html`Customer`, [])}
              ${columnBodyRenderer((item: any) => html`${item.order_customer}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.5"
              ${columnHeaderRenderer(() => html`Product Name`, [])}
              ${columnBodyRenderer((item: any) => html`${item.order_product}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Completed Qty`, [])}
              ${columnBodyRenderer((item: any) => html`${item.order_quantity} units`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Target Due Date`, [])}
              ${columnBodyRenderer((item: any) => html`${this.getFormattedDate(item.order_delivery)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Completed Date`, [])}
              ${columnBodyRenderer((item: any) => html`${this.getFormattedDate(item.actual_end)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Actual Lead Time`, [])}
              ${columnBodyRenderer((item: any) => html`
                ${this.formatTimeDifference(item.actual_start, item.actual_end)}
              `, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.5"
              ${columnHeaderRenderer(() => html`Action`, [])}
              ${columnBodyRenderer((_item: any) => html`
                <button 
                  style="background:none; border:none; color:#e53935; cursor:pointer;"
                  @click=${(e: any) => this.deleteWarehouseOrder(e.target.closest('vaadin-grid').selectedItems[0]?.$key)}>
                  <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                </button>
              `, [])}
            ></vaadin-grid-column>
          </vaadin-grid>

          <div class="action-row">
            <md-filled-button 
              @click=${this.clearWarehouse} 
              style="--md-filled-button-container-color: #e53935; --md-filled-button-label-text-color: #ffffff;">
              <md-icon slot="icon">delete_forever</md-icon> Clear Warehouse Records
            </md-filled-button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-track-warehouse': ViewTrackWarehouse;
  }
}
