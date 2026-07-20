import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Subviews (Vite will bundle and code-split these)
import './view-track-production.js';
import './view-track-warehouse.js';

@customElement('view-track')
export class ViewTrack extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
      font-family: 'Roboto', sans-serif;
    }
    .track-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
    }
    
    /* Sub-navigation tabs */
    .track-tabs {
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
    .track-tabs::-webkit-scrollbar {
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

    /* Active viewport area */
    .view-outlet {
      flex: 1;
      background-color: #ffffff;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      padding: 24px;
      overflow-y: auto;
    }
  `;

  @state() private activeTab: 'production' | 'warehouse' = 'production';

  override render() {
    return html`
      <div class="track-container">
        <div class="track-tabs">
          <button class="tab-btn ${this.activeTab === 'production' ? 'active' : ''}" @click=${() => this.activeTab = 'production'}>
            <md-icon>hourglass_empty</md-icon> Production Tracking
          </button>
          <button class="tab-btn ${this.activeTab === 'warehouse' ? 'active' : ''}" @click=${() => this.activeTab = 'warehouse'}>
            <md-icon>warehouse</md-icon> Warehouse Inventory
          </button>
        </div>

        <div class="view-outlet">
          ${this.activeTab === 'production' ? html`<view-track-production></view-track-production>` : ''}
          ${this.activeTab === 'warehouse' ? html`<view-track-warehouse></view-track-warehouse>` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-track': ViewTrack;
  }
}
