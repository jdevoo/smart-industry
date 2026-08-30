import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, push, set, remove, update } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { 
  solveOptimalOrderSelection, 
  scheduleOrdersFiniteCapacity, 
  OrderItem as SchedOrderItem,
  StationItem as SchedStationItem,
  InventoryItem as SchedInventoryItem,
  ProductItem as SchedProductItem
} from '../utils/scheduling.js';
import { displayDateFromTimestamp, formatDurationHM, formatTimeOnly } from '../utils/date.js';
import { columnBodyRenderer, columnHeaderRenderer } from '@vaadin/grid/lit.js';
import {
  ordersContext,
  scheduleDataContext,
  stationsContext,
  inventoryContext,
  productsContext,
  performanceContext,
  scheduleConfigContext,
  operationContext,
  factoryProfileContext,
  QueryContextValue,
  DocContextValue,
  OperationConfigData,
  ScheduleConfigData,
  FactoryProfileData,
  PerformanceData
} from '../context/dataContexts.js';
import { DbFolder, getCompanyPath } from '../config/db-paths.js';

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

interface ProductPartStep {
  name: string;
  sku: string;
  process?: number[];
  setup?: number[];
  cycle?: number[];
  dependency?: string;
}

interface OrderItem {
  $key: string;
  order_no: number;
  order_customer: string;
  order_product_name: string;
  order_product_description: string;
  order_product_part: ProductPartStep[];
  order_product_sku: string;
  order_quantity: number;
  order_duration: number;
  order_delivery: number;
  order_status: 'waiting' | 'wip' | 'done' | 'late' | 'cancel';
  order_color: string;
  order_date: number;
}

interface StationMachineInfo {
  mid: string;
  name: string;
  number: number;
}

interface StationItem {
  $key: string;
  st_name: string;
  st_number: number;
  st_machine?: StationMachineInfo[];
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
    .badge-cancel { color: #888888; font-weight: 500; text-decoration: line-through; }

    /* Station buttons row */
    .stations-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .stations-row::-webkit-scrollbar {
      display: none;
    }
    .station-btn {
      padding: 6px 14px;
      border: 1px solid rgba(0,0,0,0.15);
      background-color: #ffffff;
      border-radius: 6px;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      white-space: nowrap;
      font-size: 0.85rem;
      transition: background-color 0.2s, color 0.2s;
    }
    .station-btn:hover {
      background-color: rgba(0, 0, 0, 0.04);
      color: #202020;
    }
    .station-btn.active {
      background-color: #202020;
      color: #ffffff;
      border-color: #202020;
    }

    /* Gantt Chart Styling */
    .gantt-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.08);
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .gantt-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 20px;
      background-color: #fafafa;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.04);
      overflow-x: auto;
    }
    .gantt-row {
      display: flex;
      align-items: center;
      min-height: 54px;
      border-bottom: 1px dashed rgba(0,0,0,0.06);
      padding-bottom: 8px;
    }
    .gantt-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .gantt-station-label {
      width: 140px;
      font-weight: 500;
      font-size: 0.9rem;
      color: #202020;
      flex-shrink: 0;
    }
    .gantt-track {
      position: relative;
      flex: 1;
      height: 36px;
      background-color: #f0f0f0;
      border-radius: 6px;
      min-width: 600px;
    }
    .gantt-bar {
      position: absolute;
      top: 4px;
      bottom: 4px;
      border-radius: 4px;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      padding: 0 6px;
      white-space: nowrap;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-sizing: border-box;
      min-width: 4px;
    }
    .gantt-bar-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      width: 100%;
      display: block;
    }
    .gantt-bar:hover {
      transform: scaleY(1.05);
      z-index: 10;
      box-shadow: 0 4px 8px rgba(0,0,0,0.25);
    }
    .gantt-axis {
      display: flex;
      margin-left: 140px;
      padding-top: 8px;
      font-size: 0.75rem;
      color: #888;
      justify-content: space-between;
      min-width: 600px;
    }

    /* Grid Action Buttons style */
    .action-btn {
      background: none;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 50%;
      transition: background-color 0.2s, transform 0.1s;
    }
    .action-btn:active {
      transform: scale(0.92);
    }
    .action-btn md-icon {
      --md-icon-size: 18px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .action-btn.cancel-btn {
      color: #ef6c00; /* Amber/Orange for cancellation */
    }
    .action-btn.cancel-btn:hover {
      background-color: rgba(239, 108, 0, 0.08);
    }
    .action-btn.delete-btn {
      color: #d32f2f; /* Red for permanent delete */
    }
    .action-btn.delete-btn:hover {
      background-color: rgba(211, 47, 47, 0.08);
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private activeStationNumber: number | null = null;

  // Consume shared global context providers (0 redundant Firebase network listeners!)
  @consume({ context: ordersContext, subscribe: true })
  @state()
  private ordersState!: QueryContextValue<OrderItem>;

  @consume({ context: scheduleDataContext, subscribe: true })
  @state()
  private scheduleState!: QueryContextValue<ScheduleItem>;

  @consume({ context: stationsContext, subscribe: true })
  @state()
  private stationsState!: QueryContextValue<StationItem>;

  @consume({ context: scheduleConfigContext, subscribe: true })
  @state()
  private scheduleConfigState!: DocContextValue<ScheduleConfigData>;

  @consume({ context: operationContext, subscribe: true })
  @state()
  private operationConfigState!: DocContextValue<OperationConfigData>;

  @consume({ context: factoryProfileContext, subscribe: true })
  @state()
  private profileConfigState!: DocContextValue<FactoryProfileData>;

  @consume({ context: inventoryContext, subscribe: true })
  @state()
  private inventoryState!: QueryContextValue<SchedInventoryItem>;

  @consume({ context: productsContext, subscribe: true })
  @state()
  private productsState!: QueryContextValue<SchedProductItem>;

  @consume({ context: performanceContext, subscribe: true })
  @state()
  private performanceState!: DocContextValue<PerformanceData>;

  formatDuration(seconds: number): string {
    return formatDurationHM(seconds);
  }

  private async clearSchedule() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to clear the active schedule timeline? Operators on the shopfloor will lose their current tasks.')) {
      try {
        await remove(dbRef(db, getCompanyPath(companyKey, DbFolder.SCHEDULE_DATA)));
        alert('Active schedule cleared successfully.');
      } catch (err) {
        console.error('Failed to clear scheduleData', err);
      }
    }
  }

  private async runSchedulingHeuristic() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    const opConfig = this.operationConfigState.data;
    const schedConfig = this.scheduleConfigState.data;
    const profileModel = this.profileConfigState.data?.model || 'serial';
    const rawConcurrency = this.profileConfigState.data?.concurrency;
    const concurrencyVal = typeof rawConcurrency === 'number' ? rawConcurrency : (parseInt(rawConcurrency || '1') || 1);

    if (!opConfig || !schedConfig) {
      alert('Operational configs missing. Please ensure shifts are set up under Factory Setup.');
      return;
    }

    if (!confirm('This will clear the current schedule timeline and run the Discrete LP Optimization + Finite Capacity algorithm to plan pending runs. Proceed?')) {
      return;
    }

    try {
      // 1. Clear active scheduling table
      await remove(dbRef(db, getCompanyPath(companyKey, DbFolder.SCHEDULE_DATA)));

      // 2. Fetch active waiting orders
      const orders = this.ordersState.data.filter((o: OrderItem) => o.order_status !== 'done' && o.order_status !== 'cancel');
      if (orders.length === 0) {
        alert('No pending or waiting orders to schedule!');
        return;
      }

      // Calculate shift duration in seconds from op_start and op_end
      const opStartStr = opConfig?.op_start || '08:00';
      const opEndStr = opConfig?.op_end || '17:00';
      const [startH, startM] = opStartStr.split(':').map(Number);
      const [endH, endM] = opEndStr.split(':').map(Number);

      const shiftStartSec = startH * 3600 + startM * 60;
      const shiftEndSec = endH * 3600 + endM * 60;
      const shiftDurationSeconds = Math.max(3600, shiftEndSec - shiftStartSec);

      const rawAw = this.performanceState.data?.aw;
      const wasteRatio = typeof rawAw === 'number' ? rawAw : (parseFloat(rawAw || '0') || 0);

      const limit = (profileModel === 'parallel') ? concurrencyVal : 1;

      // 3. Solve Discrete Optimization (MILP) to select optimal orders constrained by workstation shift capacity & inventory
      const selectedOrders = solveOptimalOrderSelection(
        orders as unknown as SchedOrderItem[],
        this.stationsState.data as unknown as SchedStationItem[],
        {
          shiftDurationSeconds,
          concurrencyLimit: limit,
          inventory: this.inventoryState.data as unknown as SchedInventoryItem[],
          products: this.productsState.data as unknown as SchedProductItem[],
          wasteRatio
        }
      ) as unknown as OrderItem[];

      // 4. Mark selected orders WIP in Firebase
      for (const order of selectedOrders) {
        if (order.$key) {
          await update(dbRef(db, getCompanyPath(companyKey, DbFolder.ORDER_DATA, order.$key)), { order_status: 'wip' });
        }
      }

      // Set operational shifts starting timestamp
      const today = new Date();
      today.setHours(startH, startM, 0, 0);
      const initialStartTimestamp = Math.round(today.getTime() / 1000);

      const delayVal = schedConfig?.delay;
      const delayMinutes = typeof delayVal === 'number' ? delayVal : (parseInt(delayVal || '10') || 10);
      const delaySeconds = delayMinutes * 60;

      // 5. Generate finite-capacity non-overlapping workstation queue schedule
      const resultItems = scheduleOrdersFiniteCapacity(
        selectedOrders as unknown as SchedOrderItem[],
        this.stationsState.data as unknown as SchedStationItem[],
        initialStartTimestamp,
        delaySeconds,
        wasteRatio
      );

      // 6. Bulk push calculated jobs schedule straight to Firebase
      const scheduleRef = dbRef(db, getCompanyPath(companyKey, DbFolder.SCHEDULE_DATA));
      for (const job of resultItems) {
        const ref = push(scheduleRef);
        await set(ref, job);
      }

      // 7. Write system logging notification
      const notifyRef = push(dbRef(db, getCompanyPath(companyKey, DbFolder.NOTIFICATION_DATA)));
      await set(notifyRef, {
        created: Math.round(Date.now() / 1000),
        detail: `Successfully optimized and dispatched ${resultItems.length} job steps for ${selectedOrders.length} orders to shopfloor tracking.`,
        type: 'normal'
      });

      alert(`Discrete LP Optimization complete. Successfully scheduled ${selectedOrders.length} orders across workstations!`);
    } catch (err) {
      console.error('Reschedule algorithm error', err);
    }
  }

  private async removeOrder(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to delete this order booking permanently?')) {
      try {
        await remove(dbRef(db, getCompanyPath(companyKey, DbFolder.ORDER_DATA, key)));
      } catch (err) {
        console.error('Failed to remove order', err);
      }
    }
  }

  private async cancelOrder(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to cancel this order booking? This will stop it from being scheduled.')) {
      try {
        await update(dbRef(db, getCompanyPath(companyKey, DbFolder.ORDER_DATA, key)), { order_status: 'cancel' });
      } catch (err) {
        console.error('Failed to cancel order', err);
      }
    }
  }

  private async cancelJob(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to cancel and delete this specific dispatched job from the active schedule timeline?')) {
      try {
        await remove(dbRef(db, getCompanyPath(companyKey, DbFolder.SCHEDULE_DATA, key)));
      } catch (err) {
        console.error('Failed to cancel dispatched job', err);
      }
    }
  }

  override render() {
    if (this.ordersState.loading || this.scheduleState.loading || this.stationsState.loading) {
      return html`<p>Loading operational dispatch workspace...</p>`;
    }

    const orders = this.ordersState.data;
    const allJobs = this.scheduleState.data;
    const stations = this.stationsState.data;

    // Filter jobs by activeStationNumber if selected
    const activeJobs = allJobs.filter((j: ScheduleItem) => {
      if (this.activeStationNumber === null) return true;
      if (Array.isArray(j.job_station)) {
        return j.job_station.includes(this.activeStationNumber);
      }
      return j.job_station === this.activeStationNumber;
    });

    const schedConfig = this.scheduleConfigState.data;
    const profileConfig = this.profileConfigState.data;

    // Calculate Gantt overall range
    let minStart = Infinity;
    let maxEnd = -Infinity;
    allJobs.forEach((job: ScheduleItem) => {
      if (job.start < minStart) minStart = job.start;
      if (job.end > maxEnd) maxEnd = job.end;
    });

    const totalDuration = maxEnd - minStart;
    const hasGanttData = allJobs.length > 0 && totalDuration > 0 && minStart !== Infinity;

    // Create timeline ticks for axis labels if Gantt data is available
    const ticks: string[] = [];
    if (hasGanttData) {
      const numTicks = 6;
      for (let i = 0; i < numTicks; i++) {
        const time = minStart + (totalDuration * i) / (numTicks - 1);
        ticks.push(this.formatTime(time));
      }
    }

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
            <strong class="badge-waiting">${orders.filter((o: OrderItem) => o.order_status === 'waiting').length}</strong>
          </div>
          <div class="header-info-item">
            <span>Active WIP:</span>
            <strong class="badge-wip">${orders.filter((o: OrderItem) => o.order_status === 'wip').length}</strong>
          </div>
        </div>

        <!-- 1. Order Scheduling list card -->
        <div class="ledger-card">
          <div class="card-header">
            <h3 class="card-title">Pending Booking Waitlist</h3>
          </div>

          <vaadin-grid id="ordersGrid" .items=${orders} style="height: 280px;">
            <vaadin-grid-column
              flex="0.5"
              ${columnHeaderRenderer(() => html`Order No`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`#${item.order_no}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.5"
              ${columnHeaderRenderer(() => html`Customer`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`${item.order_customer}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.5"
              ${columnHeaderRenderer(() => html`Product`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`${item.order_product_name}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Qty`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`${item.order_quantity} units`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Est Duration`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`${this.formatDuration(item.order_duration)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Delivery Target`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`${this.getFormattedDate(item.order_delivery)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Status`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`
                <span class="badge-${item.order_status}">${item.order_status}</span>
              `, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Actions`, [])}
              ${columnBodyRenderer((item: OrderItem) => html`
                <div style="display:flex; gap: 8px; justify-content:flex-start; align-items:center;">
                  ${item.order_status !== 'cancel' && item.order_status !== 'done' ? html`
                    <button class="action-btn cancel-btn" @click=${() => this.cancelOrder(item.$key)} title="Cancel Booking (keeps history)">
                      <md-icon>block</md-icon>
                    </button>
                  ` : ''}
                  <button class="action-btn delete-btn" @click=${() => this.removeOrder(item.$key)} title="Delete Booking permanently">
                    <md-icon>delete_forever</md-icon>
                  </button>
                </div>
              `, [])}
            ></vaadin-grid-column>
          </vaadin-grid>

          <div class="btn-group">
            <md-outlined-button @click=${this.clearSchedule}>
              <md-icon slot="icon">delete_sweep</md-icon> Clear Schedule
            </md-outlined-button>
            <md-filled-button @click=${this.runSchedulingHeuristic}>
              <md-icon slot="icon">auto_schedule</md-icon> Run Reschedule (Discrete LP Optimization)
            </md-filled-button>
          </div>
        </div>

        <!-- 2. Computed Job timeline list card -->
        <div class="ledger-card">
          <div class="card-header" style="flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 20px;">
            <h3 class="card-title">Live Dispatched Jobs Sequence</h3>
            
            <!-- Stations Selector row -->
            <div class="stations-row" style="margin-bottom: 0;">
              <button 
                class="station-btn ${this.activeStationNumber === null ? 'active' : ''}" 
                @click=${() => this.activeStationNumber = null}>
                All Stations
              </button>
              ${stations.map((st: StationItem) => html`
                <button 
                  class="station-btn ${this.activeStationNumber === st.st_number ? 'active' : ''}" 
                  @click=${() => this.activeStationNumber = st.st_number}>
                  Station ${st.st_number} (${st.st_name})
                </button>
              `)}
            </div>
          </div>

          <vaadin-grid .items=${activeJobs} style="height: 320px;">
            <vaadin-grid-column
              flex="0.5"
              ${columnHeaderRenderer(() => html`Order`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`#${item.order_no}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.5"
              ${columnHeaderRenderer(() => html`Product Part`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`${item.job_part} (SKU: ${item.job_sku})`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Quantity`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`${item.job_quantity} units`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Station`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`ST-${item.job_station}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Estimate Start`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`${this.formatTime(item.start)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1.2"
              ${columnHeaderRenderer(() => html`Estimate End`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`${this.formatTime(item.end)}`, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="1"
              ${columnHeaderRenderer(() => html`Status`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`
                <span class="badge-${item.job_status}">${item.job_status}</span>
              `, [])}
            ></vaadin-grid-column>

            <vaadin-grid-column
              flex="0.8"
              ${columnHeaderRenderer(() => html`Actions`, [])}
              ${columnBodyRenderer((item: ScheduleItem) => html`
                <div style="display:flex; gap: 8px; justify-content:flex-start; align-items:center;">
                  ${item.job_status === 'waiting' ? html`
                    <button class="action-btn delete-btn" @click=${() => this.cancelJob(item.$key)} title="Remove from Schedule">
                      <md-icon>delete</md-icon>
                    </button>
                  ` : html`
                    <span style="font-size:0.75rem; color:#888; font-style:italic; font-weight:500;">Running</span>
                  `}
                </div>
              `, [])}
            ></vaadin-grid-column>
          </vaadin-grid>
        </div>

        <!-- 3. Scheduling Gantt Chart -->
        <div class="gantt-card">
          <h3 class="card-title">Scheduling Gantt Chart</h3>
          <p style="font-size:0.85rem; color:#666; margin:6px 0 16px 0; line-height:1.4;">
            This visual chart illustrates the chronological flow of part processing across your workstations, optimized via Mixed Integer Linear Programming (MILP) and finite-capacity workstation queuing:
          </p>

          ${!hasGanttData ? html`
            <div style="text-align:center; color:#888; font-style:italic; padding: 32px; background:#fafafa; border-radius:8px; border:1px dashed rgba(0,0,0,0.15);">
              No active schedule has been compiled yet. Run rescheduling above to project visual timelines.
            </div>
          ` : html`
            <div class="gantt-timeline">
              ${stations.map(st => {
                const stationJobs = allJobs.filter(j => {
                  if (Array.isArray(j.job_station)) {
                    return j.job_station.includes(st.st_number);
                  }
                  return j.job_station === st.st_number;
                });

                return html`
                  <div class="gantt-row">
                    <div class="gantt-station-label">
                      ST-${st.st_number} (${st.st_name})
                    </div>
                    <div class="gantt-track">
                      ${stationJobs.map(job => {
                        const startPct = ((job.start - minStart) / totalDuration) * 100;
                        const durationPct = ((job.end - job.start) / totalDuration) * 100;
                        return html`
                          <div 
                            class="gantt-bar" 
                            style="left: ${startPct}%; width: ${durationPct}%; background-color: ${job.order_color || '#202020'};"
                            title="Order #${job.order_no} - ${job.job_part} (${job.job_quantity} units)&#10;Start: ${this.formatTime(job.start)}&#10;End: ${this.formatTime(job.end)}">
                            <span class="gantt-bar-label">#${job.order_no}: ${job.job_part}</span>
                          </div>
                        `;
                      })}
                    </div>
                  </div>
                `;
              })}
              
              <!-- Timeline X-Axis Ticks -->
              <div class="gantt-axis">
                ${ticks.map(t => html`<span>${t}</span>`)}
              </div>
            </div>
          `}
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
    return formatTimeOnly(timestamp);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-plan-scheduling': ViewPlanScheduling;
  }
}
