import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Subview imports (Vite will bundle/split these)
import './view-setup-factory.js';
import './view-setup-machine.js';
import './view-setup-station.js';
import './view-setup-product.js';

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
      gap: 8px;
      background-color: #ffffff;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow-x: auto;
      scrollbar-width: none; /* Firefox */
    }
    .setup-tabs::-webkit-scrollbar {
      display: none; /* Safari/Chrome */
    }
    .tab-btn {
      padding: 10px 20px;
      border: none;
      background: none;
      border-radius: 6px;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.2s, color 0.2s;
    }
    .tab-btn:hover {
      background-color: rgba(0, 0, 0, 0.04);
      color: #202020;
    }
    .tab-btn.active {
      background-color: #202020;
      color: #ffffff;
    }

    /* Rendering body viewport */
    .view-outlet {
      flex: 1;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      padding: 24px;
      overflow-y: auto;
    }
  `;

  @state() private activeTab: 'factory' | 'machine' | 'station' | 'product' = 'factory';

  override render() {
    return html`
      <div class="setup-container">
        <div class="setup-tabs">
          <button class="tab-btn ${this.activeTab === 'factory' ? 'active' : ''}" @click=${() => this.activeTab = 'factory'}>Factory Topology</button>
          <button class="tab-btn ${this.activeTab === 'machine' ? 'active' : ''}" @click=${() => this.activeTab = 'machine'}>Machines</button>
          <button class="tab-btn ${this.activeTab === 'station' ? 'active' : ''}" @click=${() => this.activeTab = 'station'}>Work Stations</button>
          <button class="tab-btn ${this.activeTab === 'product' ? 'active' : ''}" @click=${() => this.activeTab = 'product'}>Products & Parts</button>
        </div>

        <div class="view-outlet">
          ${this.activeTab === 'factory' ? html`<view-setup-factory></view-setup-factory>` : ''}
          ${this.activeTab === 'machine' ? html`<view-setup-machine></view-setup-machine>` : ''}
          ${this.activeTab === 'station' ? html`<view-setup-station></view-setup-station>` : ''}
          ${this.activeTab === 'product' ? html`<view-setup-product></view-setup-product>` : ''}
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
