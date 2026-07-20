import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, push, set, remove, update } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';
import { sortOrdersHeuristically } from '../utils/scheduling.js';
import { displayDateFromTimestamp } from '../utils/date.js';
import { columnBodyRenderer, columnHeaderRenderer } from '@vaadin/grid/lit.js';

// Material Design 3 & Vaadin Imports
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@vaadin/grid/vaadin-grid.js';

interface ScheduleItem {
  $key: string;
  order_no: number;
  order_customer: string;
  order_product: string;
  job_part: string;
  job_sku: string;
  job_quantity: number;
  job_status: 'waiting' | 'wip' | 'done';
  job_machine: number[];
  job_station: number[];
  start: number;
  end: number;
  order_color: string;
}

interface OrderItem {
  $key: string;
  order_no: number;
  order_customer: string;
  order_product_name: string;
  order_product_description: string;
  order_product_part: any[];
  order_product_sku: string;
  order_quantity: number;
  order_duration: number;
  order_delivery: number;
  order_status: 'waiting' | 'wip' | 'done' | 'late' | 'cancel';
  order_color: string;
  order_date: number;
}

interface StationItem {
  $key: string;
  st_name: string;
  st_number: number;
  st_machine?: any[];
}

@customElement('view-plan-scheduling')
export class ViewPlanScheduling extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .scheduling-pane {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-info-bar {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      background: #ffffff;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.08);
      font-size: 0.9rem;
      color: #555;
    }
    .header-info-item {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .header-info-item strong {
      color: #202020;
    }

    /* Grid cards */
    .ledger-card {
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
      font-size: 1.25rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
    }
    .btn-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
    }

    .badge-waiting { color: #f57c00; font-weight: 500; }
    .badge-wip { color: #5e35b1; font-weight: 500; }
    .badge-done { color: #2e7d32; font-weight: 500; }
    .badge-late { color: #e53935; font-weight: 500; }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  // Real-time Queries
  private orderQueryController = new FirebaseQueryController<OrderItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/orderData` : null
  );

  private scheduleQueryController = new FirebaseQueryController<ScheduleItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/scheduleData` : null
  );

  private stationQueryController = new FirebaseQueryController<StationItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/station` : null
  );

  private scheduleConfigController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/schedule` : null
  );

  private profileConfigController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/profile` : null
  );

  private operationConfigController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/operation` : null
  );

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  }

  private async clearSchedule() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to clear the active schedule timeline? Operators on the shopfloor will lose their current tasks.')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/scheduleData`));
        alert('Active schedule cleared successfully.');
      } catch (err) {
        console.error('Failed to clear scheduleData', err);
      }
    }
  }

  private async runSchedulingHeuristic() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    const opConfig = this.operationConfigController.data;
    const schedConfig = this.scheduleConfigController.data;
    const profileModel = this.profileConfigController.data?.model || 'serial';
    const concurrencyVal = parseInt(this.profileConfigController.data?.concurrency) || 1;

    if (!opConfig || !schedConfig) {
      alert('Operational configs missing. Please ensure shifts are set up under Factory Setup.');
      return;
    }

    if (!confirm('This will clear the current schedule timeline and run the EDD/SPT algorithm to plan pending runs. Proceed?')) {
      return;
    }

    try {
      // 1. Clear active scheduling table
      await remove(dbRef(db, `/data/${companyKey}/scheduleData`));

      // 2. Fetch the unsorted, active waiting orders
      const orders = this.orderQueryController.data.filter(o => o.order_status !== 'done' && o.order_status !== 'cancel');
      if (orders.length === 0) {
        alert('No pending or waiting orders to schedule!');
        return;
      }

      // 3. Sort orders based on EDD (Earliest Due Date) + SPT (Shortest Processing Time) heuristics
      const sortedOrders = sortOrdersHeuristically(orders as any) as unknown as OrderItem[];

      // 4. Copy the concurrent orders list matching parallel capacities
      const limit = (profileModel === 'parallel') ? concurrencyVal : 1;
      const scheduledOrdersSet = sortedOrders.slice(0, limit);

      // Set operational shifts starting constraints
      const opStartStr = opConfig.op_start || '08:00';
      const [startH, startM] = opStartStr.split(':').map(Number);
      
      const today = new Date();
      today.setHours(startH, startM, 0, 0);
      const initialStartTimestamp = Math.round(today.getTime() / 1000);

      const delaySeconds = (parseInt(schedConfig.delay) || 10) * 60; // default 10 minutes delay in seconds

      // 5. Run the workload reduction, parallel machine division, and timeline offset calculators
      const resultItems: any[] = [];

      for (let i = 0; i < scheduledOrdersSet.length; i++) {
        const order = scheduledOrdersSet[i];
        
        // Mark order WIP
        await update(dbRef(db, `/data/${companyKey}/orderData/${order.$key}`), { order_status: 'wip' });

        const parts = order.order_product_part || [];

        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          const partProcesses = part.process || [];
          const partSetup = part.setup || [];
          const partCycle = part.cycle || [];

          let previousEndTime = initialStartTimestamp;

          const jobID = Math.random().toString(36).substring(2, 14);

          for (let pIdx = 0; pIdx < partProcesses.length; pIdx++) {
            const stationNum = partProcesses[pIdx];
            const setupTime = partSetup[pIdx] || 0;
            const cycleTime = partCycle[pIdx] || 0;

            const targetQty = order.order_quantity;
            const itemWorkloadSeconds = setupTime + (cycleTime * targetQty);

            // Compute allocated machines (Scales duration down under station concurrent machinery)
            const station = this.stationQueryController.data.find(s => s.st_number === stationNum);
            const machinesAvailable = station?.st_machine?.length || 1;
            const scaledDurationSeconds = Math.ceil(itemWorkloadSeconds / machinesAvailable);

            const startSeconds = previousEndTime + (pIdx > 0 ? delaySeconds : 0);
            const endSeconds = startSeconds + scaledDurationSeconds;
            
            previousEndTime = endSeconds;

            resultItems.push({
              job_id: jobID,
              order_no: order.order_no,
              order_customer: order.order_customer,
              order_product: order.order_product_name,
              order_color: order.order_color,
              job_part: part.name,
              job_sku: part.sku,
              job_quantity: order.order_quantity,
              job_status: 'waiting',
              job_machine: [machinesAvailable],
              job_station: [stationNum],
              start: startSeconds,
              end: endSeconds,
              job_complete: 0.00,
              job_good: 0,
              job_defect: 0,
              order_delivery: order.order_delivery,
              order_date: order.order_date,
              order_description: order.order_product_description
            });
          }
        }
      }

      // 6. Bulk push calculated jobs schedule straight to Firebase
      const scheduleRef = dbRef(db, `/data/${companyKey}/scheduleData`);
      for (const job of resultItems) {
        const ref = push(scheduleRef);
        await set(ref, job);
      }

      // 7. Write system logging notification
      const notifyRef = push(dbRef(db, `/data/${companyKey}/notificationData`));
      await set(notifyRef, {
        created: Math.round(Date.now() / 1000),
        detail: `Successfully re-scheduled and dispatched ${scheduledOrdersSet.length} orders to shopfloor tracking.`,
        type: 'normal'
      });

      alert('Heuristic schedule generation successfully processed. Check your live timeline details below!');
    } catch (err) {
      console.error('Reschedule algorithm error', err);
    }
  }

  private async removeOrder(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to cancel and delete this order booking?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/orderData/${key}`));
      } catch (err) {
        console.error('Failed to remove order', err);
      }
    }
  }

  private handleGridClick(e: Event) {
    const target = e.target as HTMLElement;
    const deleteBtn = target.closest('.delete-order-btn');
    if (deleteBtn) {
      const grid = this.shadowRoot?.getElementById('ordersGrid') as any;
      const item = (e as any).model?.item || (grid ? grid.selectedItems[0] : null);
      if (item && item.$key) {
        this.removeOrder(item.$key);
      }
    }
  }

  override render() {
    if (this.orderQueryController.loading || this.scheduleQueryController.loading) {
      return html`<p>Loading operational dispatch workspace...</p>`;
    }

    const orders = this.orderQueryController.data;
    const activeJobs = this.scheduleQueryController.data;

    const schedConfig = this.scheduleConfigController.data;
    const profileConfig = this.profileConfigController.data;

    return html`
      <div class="scheduling-pane">
        <!-- Header status panel -->
        <div class="header-info-bar">
          <div class="header-info-item">
            <span>Production Model:</span>
            <strong>${profileConfig?.model || 'serial'}</strong>
          </div>
          <div class="header-info-item">
            <span>Shift Target Concurrency:</span>
            <strong>${profileConfig?.concurrency || 1} lines</strong>
          </div>
          <div class="header-info-item">
            <span>Safety Delay Between Stations:</span>
            <strong>${schedConfig?.delay || 10} minutes</strong>
          </div>
          <div class="header-info-item">
            <span>Waiting bookings:</span>
            <strong class="badge-waiting">${orders.filter(o => o.order_status === 'waiting').length}</strong>
          </div>
          <div class="header-info-item">
            <span>Active WIP:</span>
            <strong class="badge-wip">${orders.filter(o => o.order_status === 'wip').length}</strong>
          </div>
        </div>

        <!-- 1. Order Scheduling list card -->
        <div class="ledger-card">
          <div class="card-header">
            <h3 class="card-title">Pending Booking Waitlist</h3>
          </div>

          <vaadin-grid id="ordersGrid" .items=${orders} style="height: 280px;" @click=${this.handleGridClick}>
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
              ${columnHeaderRenderer(() => html`Product`, [])}
              ${columnBodyRenderer((item: any) => html`${item.order_product_name}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Qty`, [])}
              ${columnBodyRenderer((item: any) => html`${item.order_quantity} units`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Est Duration`, [])}
              ${columnBodyRenderer((item: any) => html`${this.formatDuration(item.order_duration)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Delivery Target`, [])}
              ${columnBodyRenderer((item: any) => html`${this.getFormattedDate(item.order_delivery)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Status`, [])}
              ${columnBodyRenderer((item: any) => html`
                <span class="badge-${item.order_status}">${item.order_status}</span>
              `, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.5"
              ${columnHeaderRenderer(() => html`Action`, [])}
              ${columnBodyRenderer((_item: any) => html`
                <button class="delete-order-btn" style="background:none; border:none; color:#e53935; cursor:pointer; display:flex; align-items:center; justify-content:center; width:36px; height:36px;">
                  <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
                </button>
              `, [])}
            ></vaadin-grid-column>
          </vaadin-grid>

          <div class="btn-group">
            <md-outlined-button @click=${this.clearSchedule}>
              <md-icon slot="icon">delete_sweep</md-icon> Clear Schedule
            </md-outlined-button>
            <md-filled-button @click=${this.runSchedulingHeuristic}>
              <md-icon slot="icon">auto_schedule</md-icon> Run Reschedule (EDD/SPT Heuristic)
            </md-filled-button>
          </div>
        </div>

        <!-- 2. Computed Job timeline list card -->
        <div class="ledger-card">
          <div class="card-header">
            <h3 class="card-title">Live Dispatched Jobs Sequence</h3>
          </div>

          <vaadin-grid .items=${activeJobs} style="height: 320px;">
            <vaadin-grid-column
              flex="0.5"
              ${columnHeaderRenderer(() => html`Order`, [])}
              ${columnBodyRenderer((item: any) => html`#${item.order_no}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.5"
              ${columnHeaderRenderer(() => html`Product Part`, [])}
              ${columnBodyRenderer((item: any) => html`${item.job_part} (SKU: ${item.job_sku})`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Quantity`, [])}
              ${columnBodyRenderer((item: any) => html`${item.job_quantity} units`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Station`, [])}
              ${columnBodyRenderer((item: any) => html`ST-${item.job_station}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Estimate Start`, [])}
              ${columnBodyRenderer((item: any) => html`${this.formatTime(item.start)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Estimate End`, [])}
              ${columnBodyRenderer((item: any) => html`${this.formatTime(item.end)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Status`, [])}
              ${columnBodyRenderer((item: any) => html`
                <span class="badge-${item.job_status}">${item.job_status}</span>
              `, [])}
            ></vaadin-grid-column>
          </vaadin-grid>
        </div>
      </div>
    `;
  }

  // Client helper methods called inside template nodes
  getFormattedDate(timestamp: number): string {
    if (!timestamp) return 'N/A';
    return displayDateFromTimestamp(timestamp * 1000);
  }

  formatTime(timestamp: number): string {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-plan-scheduling': ViewPlanScheduling;
  }
}
