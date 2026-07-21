import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, update } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';
import { displayDateFromTimestamp } from '../utils/date.js';

@customElement('view-dashboard-overview')
export class ViewDashboardOverview extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .setup-warning-card {
      border: 2px dashed #ffb300;
      border-radius: 12px;
      padding: 24px;
      background-color: #fff9e6;
      text-align: center;
      margin-bottom: 24px;
      animation: blink 2s infinite alternate;
    }
    @keyframes blink {
      0% { border-color: #ffb300; }
      100% { border-color: #e53935; }
    }
    .warning-title {
      font-size: 1.3rem;
      font-weight: 500;
      color: #b7791f;
      margin: 0 0 8px 0;
    }
    .warning-text {
      color: #744210;
      margin-bottom: 16px;
    }
    .setup-checklist {
      list-style-type: none;
      padding: 0;
      margin: 16px auto;
      max-width: 480px;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .setup-checklist li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      padding: 6px 12px;
      border-radius: 6px;
    }
    .setup-checklist li.checked {
      background-color: rgba(46, 125, 50, 0.08);
      color: #2e7d32;
    }
    .setup-checklist li.pending {
      background-color: rgba(245, 124, 0, 0.08);
      color: #e65100;
    }
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
    }
    .setup-checklist md-icon {
      font-size: 20px;
    }

    /* KPI Grid layout */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 4px;
      padding: 32px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      text-align: center;
      align-items: center;
      justify-content: center;
      min-height: 180px;
    }
    .kpi-title {
      font-size: 1.35rem;
      font-weight: 400;
      color: #666666;
      margin: 0;
    }
    .kpi-value {
      font-size: 6.5rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
      line-height: 1;
    }

    @media (max-width: 1024px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 768px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }
      .kpi-value {
        font-size: 5rem;
      }
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private remainOpTime = 'Checking Shift...';

  // Subscriptions
  private ordersController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/orderData` : null
  );

  private machinesController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/machine` : null
  );

  private stationsController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/station` : null
  );

  private scheduleController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/schedule` : null
  );

  private operationController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/operation` : null
  );

  private performanceController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/performanceData` : null
  );

  private productsController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/product` : null
  );

  override updated() {
    this.calculateRemainOpTime();
    this.checkAutoSetupComplete();
  }

  private async checkAutoSetupComplete() {
    const profile = this.authState.profile;
    const uid = this.authState.user?.uid;
    if (!profile || !uid || profile.setup) return;

    const hasMachines = this.machinesController.data.length > 0;
    const hasStations = this.stationsController.data.length > 0;
    const hasProducts = this.productsController.data.length > 0;
    const hasOperation = this.operationController.data && this.operationController.data.production_model;

    if (hasMachines && hasStations && hasProducts && hasOperation) {
      try {
        await update(dbRef(db, `/user/${uid}`), { setup: true });
      } catch (err) {
        console.error('Error auto-updating setup status', err);
      }
    }
  }

  private calculateRemainOpTime() {
    const op = this.operationController.data;
    if (!op || !op.op_end || !op.op_start || !op.op_day) {
      this.remainOpTime = 'No Operation Day';
      return;
    }

    const opdayArr = op.op_day.split(',');
    const date = new Date();
    
    const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dateText = daysMap[date.getDay()];

    const current_hour = date.getHours();
    const current_minute = date.getMinutes();
    const current = current_hour + current_minute / 60;
    
    // Parse times like "08:00"
    const [startH, startM] = op.op_start.split(':').map(Number);
    const [endH, endM] = op.op_end.split(':').map(Number);
    const starttime = startH + startM / 60;
    const endtime = endH + endM / 60;

    const timeleft = endtime - current;

    if (opdayArr.includes(dateText)) {
      if (current < starttime || current > endtime) {
        this.remainOpTime = 'End of shift';
      } else {
        const hrs = Math.floor(timeleft);
        this.remainOpTime = `${hrs} hrs`;
      }
    } else {
      this.remainOpTime = 'Day off';
    }
  }

  private getNextIntervalStr(last_timestamp: number, intervalDays: number): string {
    if (!last_timestamp || !intervalDays) return 'N/A';
    const current = Math.floor(Date.now() / 1000);
    const diff = current - last_timestamp;
    const range = intervalDays * 24 * 60 * 60;

    if (diff <= range) {
      const nextIntervalTimeStamp = (last_timestamp + range) * 1000;
      return displayDateFromTimestamp(nextIntervalTimeStamp);
    } else {
      // Auto-reschedule timer threshold crossed, automatically update database interval anchor
      const companyKey = this.authState.profile?.key;
      if (companyKey) {
        update(dbRef(db, `/data/${companyKey}/factoryData/schedule`), {
          start_interval: current
        }).catch(err => console.error('Auto-interval reset error', err));
      }
      const nextIntervalTimeStamp = (current + range) * 1000;
      return displayDateFromTimestamp(nextIntervalTimeStamp);
    }
  }

  override render() {
    if (this.ordersController.loading || this.machinesController.loading || this.stationsController.loading || this.productsController.loading) {
      return html`<p>Loading operational dashboard metrics...</p>`;
    }

    const orders = this.ordersController.data;
    const waitCount = orders.filter(o => o.order_status === 'waiting').length;
    const wipCount = orders.filter(o => o.order_status === 'wip').length;
    const doneCount = orders.filter(o => o.order_status === 'done').length;

    const oee = this.performanceController.data?.oee || 95; // default to 95 if not loaded as shown in original
    const sched = this.scheduleController.data;

    const hasMachines = this.machinesController.data.length > 0;
    const hasStations = this.stationsController.data.length > 0;
    const hasProducts = this.productsController.data.length > 0;
    const hasOperation = this.operationController.data && this.operationController.data.production_model;

    return html`
      <!-- New User Checklist Alert -->
      ${!this.authState.profile?.setup ? html`
        <div class="setup-warning-card">
          <h4 class="warning-title">Configure your Factory Layout</h4>
          <p class="warning-text">Before you can book sales orders or run production schedules, your factory topology must be configured. Please complete the following checklist:</p>
          
          <ul class="setup-checklist">
            <li class="${hasMachines ? 'checked' : 'pending'}">
              <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">
                ${hasMachines ? 'check_circle' : 'pending'}
              </span>
              Register your Machinery (${this.machinesController.data.length} registered)
            </li>
            <li class="${hasStations ? 'checked' : 'pending'}">
              <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">
                ${hasStations ? 'check_circle' : 'pending'}
              </span>
              Configure assembly Work Stations (${this.stationsController.data.length} configured)
            </li>
            <li class="${hasProducts ? 'checked' : 'pending'}">
              <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">
                ${hasProducts ? 'check_circle' : 'pending'}
              </span>
              Define your Products & Part sequences (${this.productsController.data.length} defined)
            </li>
            <li class="${hasOperation ? 'checked' : 'pending'}">
              <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">
                ${hasOperation ? 'check_circle' : 'pending'}
              </span>
              Set your Factory Operating Shifts and Flow Model
            </li>
          </ul>

          <md-filled-button style="margin-top: 8px;" @click=${() => window.location.href = '/app/setup'}>Go to Setup Workspace</md-filled-button>
        </div>
      ` : ''}

      <div class="kpi-grid">
        <div class="kpi-card">
          <h4 class="kpi-title">Waiting order</h4>
          <p class="kpi-value">${waitCount}</p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">WIP</h4>
          <p class="kpi-value">${wipCount}</p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">Completed order</h4>
          <p class="kpi-value">${doneCount}</p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">Average OEE</h4>
          <p class="kpi-value">${oee}%</p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">Working machines</h4>
          <p class="kpi-value">${this.machinesController.data.length}</p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">Working stations</h4>
          <p class="kpi-value">${this.stationsController.data.length}</p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">Next reschedule</h4>
          <p class="kpi-value" style="font-size: 3.5rem;">
            ${sched ? this.getNextIntervalStr(sched.start_interval, sched.interval) : 'N/A'}
          </p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">Reschedule interval</h4>
          <p class="kpi-value">${sched?.interval || 1}</p>
        </div>

        <div class="kpi-card">
          <h4 class="kpi-title">Operation time left</h4>
          <p class="kpi-value" style="font-size: 3.5rem; font-weight: 500;">${this.remainOpTime}</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-dashboard-overview': ViewDashboardOverview;
  }
}
