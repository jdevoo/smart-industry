import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, remove } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';
import { columnBodyRenderer, columnHeaderRenderer } from '@vaadin/grid/lit.js';

// Material Design 3 Imports
import '@material/web/button/filled-button.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

interface NotificationItem {
  $key: string;
  created: number;
  type: 'normal' | 'warn' | 'critical';
  detail: string;
}

@customElement('view-dashboard-notification')
export class ViewDashboardNotification extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .notification-pane {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .filter-bar {
      display: flex;
      gap: 16px;
      align-items: center;
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      flex-wrap: wrap;
    }
    md-outlined-select, input[type="date"] {
      min-width: 200px;
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
    
    /* Grid container card */
    .grid-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.08);
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
      font-size: 1.2rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
    }
    
    .status-normal { color: #2e7d32; font-weight: 500; }
    .status-warn { color: #f57c00; font-weight: 500; }
    .status-critical { color: #e53935; font-weight: 500; }

    .action-row {
      display: flex;
      justify-content: center;
      margin-top: 24px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private filterSeverity = 'default';
  @state() private filterDate = '';

  private notificationsController = new FirebaseQueryController<NotificationItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/notificationData` : null
  );

  override connectedCallback() {
    super.connectedCallback();
    // Default filter date to today's date
    const today = new Date();
    let dd = today.getDate().toString();
    let mm = (today.getMonth() + 1).toString();
    const yyyy = today.getFullYear();
    if (Number(dd) < 10) dd = '0' + dd;
    if (Number(mm) < 10) mm = '0' + mm;
    this.filterDate = `${yyyy}-${mm}-${dd}`;
  }

  private async clearAllNotifications() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to delete and clear all factory notifications?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/notificationData`));
      } catch (err) {
        console.error('Failed to clear notifications', err);
      }
    }
  }

  private getFilteredNotifications(notifications: NotificationItem[]) {
    return notifications.filter(item => {
      // 1. Filter by Date (Match Calendar date)
      const itemDateStr = new Date(item.created * 1000).toISOString().split('T')[0];
      const matchDate = !this.filterDate || itemDateStr === this.filterDate;

      // 2. Filter by Severity Type
      const matchSeverity = this.filterSeverity === 'default' || item.type === this.filterSeverity;

      return matchDate && matchSeverity;
    });
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  override render() {
    if (this.notificationsController.loading) {
      return html`<p>Loading Notification logs...</p>`;
    }

    const filteredList = this.getFilteredNotifications(this.notificationsController.data);

    return html`
      <div class="notification-pane">
        <div class="filter-bar">
          <md-outlined-select 
            label="Severity Filter" 
            .value=${this.filterSeverity} 
            @change=${(e: any) => this.filterSeverity = e.target.value}>
            <md-select-option value="default"><div slot="headline">All Alerts</div></md-select-option>
            <md-select-option value="normal"><div slot="headline">Normal</div></md-select-option>
            <md-select-option value="warn"><div slot="headline">Warning</div></md-select-option>
            <md-select-option value="critical"><div slot="headline">Critical</div></md-select-option>
          </md-outlined-select>

          <div style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-size:0.8rem; color:#666; font-weight:500;">Filter Date</label>
            <input 
              type="date" 
              class="date-input"
              .value=${this.filterDate}
              @input=${(e: any) => this.filterDate = e.target.value}/>
          </div>
        </div>

        <div class="grid-card">
          <div class="card-header">
            <h3 class="card-title">Notification Registry Log</h3>
          </div>

          <vaadin-grid .items=${filteredList} style="height: 360px;">
            <vaadin-grid-column
              flex="0.5"
              ${columnHeaderRenderer(() => html`#`, [])}
              ${columnBodyRenderer((_item: any, model: any) => html`${model.index}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Severity`, [])}
              ${columnBodyRenderer((item: any) => html`
                <span class="status-${item.type}">${item.type}</span>
              `, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="3"
              ${columnHeaderRenderer(() => html`Detail Description`, [])}
              ${columnBodyRenderer((item: any) => html`${item.detail}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.5"
              ${columnHeaderRenderer(() => html`Timestamp`, [])}
              ${columnBodyRenderer((item: any) => html`
                ${this.formatTimestamp(item.created)}
              `, [])}
            ></vaadin-grid-column>
          </vaadin-grid>

          <div class="action-row">
            <md-filled-button 
              @click=${this.clearAllNotifications} 
              style="--md-filled-button-container-color: #e53935; --md-filled-button-label-text-color: #ffffff;">
              Clear All Notifications
            </md-filled-button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-dashboard-notification': ViewDashboardNotification;
  }
}
