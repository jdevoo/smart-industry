import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Import sub-views (Dynamic bundle splitting handles this)
import './view-dashboard-overview.js';
import './view-dashboard-notification.js';
import './view-dashboard-statistics.js';
import '@material/web/icon/icon.js';

@customElement('view-dashboard')
export class ViewDashboard extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
    }
    
    /* Sub-navigation tabs */
    .dashboard-tabs {
      display: flex;
      background-color: #202020;
      padding: 0 16px;
      height: 64px;
      align-items: stretch;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
      border-radius: 4px;
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

  @state() private activeTab: 'overview' | 'notification' | 'statistics' = 'overview';

  override render() {
    return html`
      <div class="dashboard-container">
        <div class="dashboard-tabs">
          <button class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" @click=${() => this.activeTab = 'overview'}>
            <md-icon>dashboard</md-icon> Overview
          </button>
          <button class="tab-btn ${this.activeTab === 'notification' ? 'active' : ''}" @click=${() => this.activeTab = 'notification'}>
            <md-icon>notifications</md-icon> Notification
          </button>
          <button class="tab-btn ${this.activeTab === 'statistics' ? 'active' : ''}" @click=${() => this.activeTab = 'statistics'}>
            <md-icon>analytics</md-icon> Statistic
          </button>
        </div>

        <div class="view-outlet">
          ${this.activeTab === 'overview' ? html`<view-dashboard-overview></view-dashboard-overview>` : ''}
          ${this.activeTab === 'notification' ? html`<view-dashboard-notification></view-dashboard-notification>` : ''}
          ${this.activeTab === 'statistics' ? html`<view-dashboard-statistics></view-dashboard-statistics>` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-dashboard': ViewDashboard;
  }
}
