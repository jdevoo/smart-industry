import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Subviews (Vite will bundle and code-split these)
import './view-plan-order.js';
import './view-plan-scheduling.js';
import './view-plan-production.js';

@customElement('view-plan')
export class ViewPlan extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100%;
      font-family: 'Roboto', sans-serif;
    }
    .plan-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: 100%;
    }
    
    /* Sub-navigation tabs */
    .plan-tabs {
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
    .plan-tabs::-webkit-scrollbar {
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

  @state() private activeTab: 'order' | 'scheduling' | 'production' = 'order';

  override render() {
    return html`
      <div class="plan-container">
        <div class="plan-tabs">
          <button class="tab-btn ${this.activeTab === 'order' ? 'active' : ''}" @click=${() => this.activeTab = 'order'}>
            <md-icon>list_alt</md-icon> Order
          </button>
          <button class="tab-btn ${this.activeTab === 'scheduling' ? 'active' : ''}" @click=${() => this.activeTab = 'scheduling'}>
            <md-icon>calendar_month</md-icon> Scheduling
          </button>
          <button class="tab-btn ${this.activeTab === 'production' ? 'active' : ''}" @click=${() => this.activeTab = 'production'}>
            <md-icon>precision_manufacturing</md-icon> Production
          </button>
        </div>

        <div class="view-outlet">
          ${this.activeTab === 'order' ? html`<view-plan-order></view-plan-order>` : ''}
          ${this.activeTab === 'scheduling' ? html`<view-plan-scheduling></view-plan-scheduling>` : ''}
          ${this.activeTab === 'production' ? html`<view-plan-production></view-plan-production>` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-plan': ViewPlan;
  }
}
