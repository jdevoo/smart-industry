import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Subview imports (Vite will bundle/split these)
import './view-setup-factory.js';
import './view-setup-machine.js';
import './view-setup-station.js';
import './view-setup-product.js';
import './view-setup-customer.js';
import './view-setup-inventory.js';
import '@material/web/icon/icon.js';

@customElement('view-setup')
export class ViewSetup extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .setup-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
    }
    
    /* Sub-navigation tabs */
    .setup-tabs {
      display: flex;
      background-color: #202020;
      padding: 0 16px;
      height: 64px;
      align-items: stretch;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      border-radius: 4px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .setup-tabs::-webkit-scrollbar {
      display: none;
    }
    .tab-btn {
      padding: 0 24px;
      border: none;
      background: none;
      font-weight: 500;
      color: #aaaaaa;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      border-bottom: 3px solid transparent;
      transition: color 0.2s, border-color 0.2s;
    }
    .tab-btn md-icon {
      font-size: 20px;
    }
    .tab-btn:hover {
      color: #ffffff;
      background-color: rgba(255,255,255,0.05);
    }
    .tab-btn.active {
      color: #ffffff;
      border-bottom: 3px solid #ffffff;
    }

    /* Rendering body viewport */
    .view-outlet {
      flex: 1;
      background-color: #ffffff;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      padding: 24px;
      overflow-y: auto;
    }
  `;

  @state() private activeTab: 'factory' | 'machine' | 'station' | 'product' | 'customer' | 'inventory' = 'factory';

  override render() {
    return html`
      <div class="setup-container">
        <div class="setup-tabs">
          <button class="tab-btn ${this.activeTab === 'factory' ? 'active' : ''}" @click=${() => this.activeTab = 'factory'}>
            <md-icon>factory</md-icon> Factory Topology
          </button>
          <button class="tab-btn ${this.activeTab === 'machine' ? 'active' : ''}" @click=${() => this.activeTab = 'machine'}>
            <md-icon>precision_manufacturing</md-icon> Machines
          </button>
          <button class="tab-btn ${this.activeTab === 'station' ? 'active' : ''}" @click=${() => this.activeTab = 'station'}>
            <md-icon>terminal</md-icon> Work Stations
          </button>
          <button class="tab-btn ${this.activeTab === 'product' ? 'active' : ''}" @click=${() => this.activeTab = 'product'}>
            <md-icon>category</md-icon> Products & Parts
          </button>
          <button class="tab-btn ${this.activeTab === 'customer' ? 'active' : ''}" @click=${() => this.activeTab = 'customer'}>
            <md-icon>people</md-icon> Customers
          </button>
          <button class="tab-btn ${this.activeTab === 'inventory' ? 'active' : ''}" @click=${() => this.activeTab = 'inventory'}>
            <md-icon>warehouse</md-icon> Inventory
          </button>
        </div>

        <div class="view-outlet">
          ${this.activeTab === 'factory' ? html`<view-setup-factory></view-setup-factory>` : ''}
          ${this.activeTab === 'machine' ? html`<view-setup-machine></view-setup-machine>` : ''}
          ${this.activeTab === 'station' ? html`<view-setup-station></view-setup-station>` : ''}
          ${this.activeTab === 'product' ? html`<view-setup-product></view-setup-product>` : ''}
          ${this.activeTab === 'customer' ? html`<view-setup-customer></view-setup-customer>` : ''}
          ${this.activeTab === 'inventory' ? html`<view-setup-inventory></view-setup-inventory>` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-setup': ViewSetup;
  }
}
