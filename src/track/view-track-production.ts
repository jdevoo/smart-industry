import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, push, set, remove, update, get } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';
import { displayDateFromTimestamp } from '../utils/date.js';

// Material Design 3 Imports
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/switch/switch.js';
import '@material/web/icon/icon.js';

interface WIPJobItem {
  $key: string;
  job_id: string;
  order_no: number;
  order_customer: string;
  order_product: string;
  order_color: string;
  job_part: string;
  job_sku: string;
  job_quantity: number;
  job_status: 'waiting' | 'wip' | 'done';
  job_machine: number[];
  job_station: number[];
  job_sensor?: string;
  job_good: number;
  job_defect: number;
  start: number;
  end: number;
  actual_start?: number;
  actual_end?: number;
}

interface DeviceItem {
  $key: string;
  name: string;
  type: string;
  machine: string;
  counter: number;
  enable: boolean;
  update: number;
}

interface StationItem {
  $key: string;
  st_name: string;
  st_number: number;
}

@customElement('view-track-production')
export class ViewTrackProduction extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .track-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .panel-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .panel-title {
      font-size: 1.25rem;
      font-weight: 500;
      color: #202020;
      margin: 0 0 20px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 12px;
    }

    /* Stations selector row */
    .stations-row {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .stations-row::-webkit-scrollbar {
      display: none;
    }
    .station-btn {
      padding: 10px 20px;
      border: 1px solid rgba(0,0,0,0.15);
      background-color: #ffffff;
      border-radius: 6px;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      white-space: nowrap;
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

    /* Jobs grid layout */
    .jobs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .job-card {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 10px;
    }
    .job-title {
      font-weight: 500;
      font-size: 1.1rem;
      margin: 0;
      color: #202020;
    }
    .job-meta {
      font-size: 0.8rem;
      color: #666;
      margin-top: 2px;
    }
    .job-progress-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85rem;
      color: #555;
    }
    .job-progress-bar {
      height: 6px;
      border-radius: 3px;
      background-color: #eee;
      overflow: hidden;
      width: 100%;
    }
    .job-progress-fill {
      height: 100%;
      background-color: #2e7d32;
      transition: width 0.3s ease;
    }
    
    .status-badge {
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }
    .badge-waiting { color: #f57c00; }
    .badge-wip { color: #5e35b1; }
    .badge-done { color: #2e7d32; }

    .control-btn-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: auto;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 12px;
    }

    /* Device Cards Grid */
    .devices-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .device-card {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 12px;
      padding: 16px;
      background-color: #fafafa;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .device-title {
      font-size: 1.05rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .device-meta-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
      color: #555;
    }

    /* Modals overlays */
    .overlay {
      position: fixed;
      top: 0; right: 0; bottom: 0; left: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .dialog {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dialog h4 {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private activeStationNumber = 1;

  // Add Device modal states
  @state() private showAddDeviceDialog = false;
  @state() private newDeviceName = '';
  @state() private newDeviceType = 'nodeMCU esp8266';
  @state() private newDeviceMachine = '';

  // Finish Job modal states
  @state() private activeJobReportingKey: string | null = null;
  @state() private reportingGoodCount = 0;
  @state() private reportingDefectCount = 0;

  private _boundEscHandler = this._handleEscKey.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._boundEscHandler);
  }

  override disconnectedCallback() {
    window.removeEventListener('keydown', this._boundEscHandler);
    super.disconnectedCallback();
  }

  private _handleEscKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (this.showAddDeviceDialog) {
        this.showAddDeviceDialog = false;
      }
      if (this.activeJobReportingKey) {
        this.activeJobReportingKey = null;
      }
    }
  }

  // Queries
  private jobsQueryController = new FirebaseQueryController<WIPJobItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/trackingData` : null
  );

  private devicesQueryController = new FirebaseQueryController<DeviceItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/device` : null
  );

  private stationsQueryController = new FirebaseQueryController<StationItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/station` : null
  );

  // Monitor pulse counts from bound devices to trigger auto-completion
  override updated() {
    const jobs = this.jobsQueryController.data;
    const devices = this.devicesQueryController.data;
    const companyKey = this.authState.profile?.key;

    if (!companyKey || jobs.length === 0 || devices.length === 0) return;

    jobs.forEach(job => {
      // If a job is active, has a sensor assigned, and the sensor count meets/exceeds the quantity, auto-complete
      if (job.job_status === 'wip' && job.job_sensor) {
        const boundDevice = devices.find(d => d.name === job.job_sensor);
        if (boundDevice && boundDevice.counter >= job.job_quantity) {
          this.autoCompleteWIPJob(job, boundDevice.counter);
        }
      }
    });
  }

  private async autoCompleteWIPJob(job: WIPJobItem, counterVal: number) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    const timestamp = Math.round(Date.now() / 1000);

    try {
      // 1. Move job status to done and write sensor metrics
      await update(dbRef(db, `/data/${companyKey}/trackingData/${job.$key}`), {
        job_status: 'done',
        job_good: job.job_quantity,
        job_defect: 0,
        actual_end: timestamp
      });

      // 2. Increment overall daily workspace completed contribution index
      const commitSnapshot = await get(dbRef(db, `/data/${companyKey}/commitData`));
      if (commitSnapshot.exists()) {
        const commits = commitSnapshot.val() as any[];
        const todayDateStr = displayDateFromTimestamp(timestamp * 1000);
        const targetDayIdx = commits.findIndex(c => c.date === todayDateStr);
        if (targetDayIdx !== -1) {
          const count = (commits[targetDayIdx].commit || 0) + 1;
          const level = Math.min(4, Math.ceil(count / 5)); // scales up level every 5 completed runs
          await update(dbRef(db, `/data/${companyKey}/commitData/${targetDayIdx}`), {
            commit: count,
            level: level
          });
        }
      }

      // 3. Post a clean logger event to notify operators
      const notifyRef = push(dbRef(db, `/data/${companyKey}/notificationData`));
      await set(notifyRef, {
        created: timestamp,
        detail: `Telemetry Event: Sensor automatically completed run #${job.order_no} (${job.job_part}). Recorded ${counterVal} items.`,
        type: 'normal'
      });
    } catch (err) {
      console.error('Auto completion error', err);
    }
  }

  private async receiveJob(job: WIPJobItem) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    const timestamp = Math.round(Date.now() / 1000);

    try {
      await update(dbRef(db, `/data/${companyKey}/trackingData/${job.$key}`), {
        job_status: 'wip',
        actual_start: timestamp
      });
    } catch (err) {
      console.error('Failed to receive job', err);
    }
  }

  private openFinishJobReport(key: string, totalQuantity: number) {
    this.activeJobReportingKey = key;
    this.reportingGoodCount = totalQuantity;
    this.reportingDefectCount = 0;
  }

  private async submitFinishedJobReport() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey || !this.activeJobReportingKey) return;

    const timestamp = Math.round(Date.now() / 1000);

    try {
      // 1. Mark job status as done, write reported quantities
      await update(dbRef(db, `/data/${companyKey}/trackingData/${this.activeJobReportingKey}`), {
        job_status: 'done',
        job_good: this.reportingGoodCount,
        job_defect: this.reportingDefectCount,
        actual_end: timestamp
      });

      // 2. Increment contribution calendar tally
      const commitSnapshot = await get(dbRef(db, `/data/${companyKey}/commitData`));
      if (commitSnapshot.exists()) {
        const commits = commitSnapshot.val() as any[];
        const todayDateStr = displayDateFromTimestamp(timestamp * 1000);
        const targetDayIdx = commits.findIndex(c => c.date === todayDateStr);
        if (targetDayIdx !== -1) {
          const count = (commits[targetDayIdx].commit || 0) + 1;
          const level = Math.min(4, Math.ceil(count / 5));
          await update(dbRef(db, `/data/${companyKey}/commitData/${targetDayIdx}`), {
            commit: count,
            level: level
          });
        }
      }

      this.activeJobReportingKey = null;
      alert('Job run completion successfully logged to tracking history.');
    } catch (err) {
      console.error('Error reporting job completion', err);
    }
  }

  private async removeJob(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to remove this active job from tracking?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/trackingData/${key}`));
      } catch (err) {
        console.error('Failed to remove job', err);
      }
    }
  }

  private async bindJobSensor(jobKey: string, sensorName: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    try {
      await update(dbRef(db, `/data/${companyKey}/trackingData/${jobKey}`), {
        job_sensor: sensorName
      });
    } catch (err) {
      console.error('Error binding sensor to job', err);
    }
  }

  private async resetDeviceCounter(deviceKey: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    try {
      await update(dbRef(db, `/data/${companyKey}/factoryData/device/${deviceKey}`), {
        counter: 0,
        update: Math.round(Date.now() / 1000)
      });
    } catch (err) {
      console.error('Error resetting device counter', err);
    }
  }

  private async removeDevice(deviceKey: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to delete and unregister this IoT tracker device?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/factoryData/device/${deviceKey}`));
      } catch (err) {
        console.error('Error removing device', err);
      }
    }
  }

  private async addIoTDevice() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (!this.newDeviceName) {
      alert('Device Identifier Name is a required field.');
      return;
    }

    const payload = {
      name: this.newDeviceName,
      type: this.newDeviceType,
      machine: this.newDeviceMachine,
      counter: 0,
      enable: true,
      update: Math.round(Date.now() / 1000)
    };

    try {
      const devicesRef = dbRef(db, `/data/${companyKey}/factoryData/device`);
      const newDeviceRef = push(devicesRef);
      await set(newDeviceRef, payload);

      this.showAddDeviceDialog = false;
      this.newDeviceName = '';
      this.newDeviceMachine = '';
    } catch (err) {
      console.error('Error adding device', err);
    }
  }

  // Client helpers
  formatTime(timestamp?: number): string {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  override render() {
    if (this.jobsQueryController.loading || this.devicesQueryController.loading || this.stationsQueryController.loading) {
      return html`<p>Establishing live shopfloor monitors connection...</p>`;
    }

    const stations = this.stationsQueryController.data;
    const activeJobs = this.jobsQueryController.data.filter(j => j.job_station[0] === this.activeStationNumber);
    const devices = this.devicesQueryController.data;

    return html`
      <div class="track-grid">
        <!-- 1. Live Job Tracking Board -->
        <div class="panel-card">
          <h3 class="panel-title">Work-In-Progress Job Tracking</h3>

          <!-- Stations Selector Row -->
          <div class="stations-row">
            ${stations.map(st => html`
              <button 
                class="station-btn ${this.activeStationNumber === st.st_number ? 'active' : ''}" 
                @click=${() => this.activeStationNumber = st.st_number}>
                Station ${st.st_number} (${st.st_name})
              </button>
            `)}
          </div>

          ${activeJobs.length === 0 ? html`
            <p style="text-align:center; color:#888; font-style:italic;">No WIP tasks dispatched to Station #${this.activeStationNumber} currently. Run rescheduling to dispatch jobs.</p>
          ` : html`
            <div class="jobs-grid">
              ${activeJobs.map(job => {
                const progressPercent = job.job_good && job.job_quantity ? Math.min(100, Math.round((job.job_good * 100) / job.job_quantity)) : 0;
                return html`
                  <div class="job-card" style="border-top: 5px solid ${job.order_color || '#202020'}">
                    <div class="job-header">
                      <div>
                        <h4 class="job-title">${job.job_part}</h4>
                        <p class="job-meta">Order: #${job.order_no} - Client: ${job.order_customer}</p>
                      </div>
                      <span class="status-badge badge-${job.job_status}">${job.job_status}</span>
                    </div>

                    <div class="job-progress-row">
                      <div style="display:flex; justify-content:space-between;">
                        <span>Progress:</span>
                        <strong>${job.job_good || 0} / ${job.job_quantity} units</strong>
                      </div>
                      <div class="job-progress-bar">
                        <div class="job-progress-fill" style="width: ${progressPercent}%"></div>
                      </div>
                    </div>

                    <div style="font-size:0.8rem; color:#555; line-height:1.5;">
                      <div><strong>Estimate Start:</strong> ${this.formatTime(job.start)}</div>
                      <div><strong>Estimate End:</strong> ${this.formatTime(job.end)}</div>
                      <div><strong>Actual Start:</strong> ${this.formatTime(job.actual_start)}</div>
                      <div><strong>Actual End:</strong> ${this.formatTime(job.actual_end)}</div>
                      <div><strong>Bound Sensor:</strong> <code>${job.job_sensor || 'Unassigned'}</code></div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
                      <label style="font-size:0.75rem; color:#666; font-weight:500;">Assign Sensor Target</label>
                      <select 
                        style="height:32px; border-radius:4px; border:1px solid #ccc; font-size:0.85rem;"
                        .value=${job.job_sensor || ''}
                        @change=${(e: any) => this.bindJobSensor(job.$key, e.target.value)}>
                        <option value="">-- No Sensor Bound --</option>
                        ${devices.map(d => html`
                          <option value=${d.name}>${d.name} (${d.type})</option>
                        `)}
                      </select>
                    </div>

                    <div class="control-btn-group">
                      ${job.job_status === 'waiting' ? html`
                        <md-filled-button @click=${() => this.receiveJob(job)}>
                          <md-icon slot="icon">play_arrow</md-icon> Receive Job
                        </md-filled-button>
                      ` : ''}

                      ${job.job_status === 'wip' ? html`
                        <md-filled-button 
                          @click=${() => this.openFinishJobReport(job.$key, job.job_quantity)}
                          style="--md-filled-button-container-color: #7cb342; --md-filled-button-label-text-color: #ffffff;">
                          <md-icon slot="icon">done</md-icon> Finish Job
                        </md-filled-button>
                      ` : ''}

                      <md-outlined-button @click=${() => this.removeJob(job.$key)}>
                        <md-icon slot="icon">delete</md-icon> Remove Card
                      </md-outlined-button>
                    </div>
                  </div>
                `;
              })}
            </div>
          `}
        </div>

        <!-- 2. Tracking Device Management -->
        <div class="panel-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom:12px;">
            <h3 class="panel-title" style="margin:0; border-bottom:none; padding-bottom:0;">Tracking Device Management</h3>
            <md-filled-button @click=${() => this.showAddDeviceDialog = true}>
              <md-icon slot="icon">add</md-icon> Register Sensor Device
            </md-filled-button>
          </div>

          ${devices.length === 0 ? html`
            <p style="text-align:center; font-style:italic; color:#888;">No active IoT tracker devices registered. Click 'Register Sensor Device' to mount hardware.</p>
          ` : html`
            <div class="devices-grid">
              ${devices.map(dev => html`
                <div class="device-card">
                  <h4 class="device-title">
                    <span>${dev.name}</span>
                    <span style="font-size:0.75rem; padding: 2px 8px; border-radius:10px; background-color: #eafaf1; color: #2e7d32;">Online</span>
                  </h4>

                  <div class="device-meta-list">
                    <div><strong>Hardware Type:</strong> ${dev.type}</div>
                    <div><strong>Target Machine:</strong> ${dev.machine || 'Unallocated'}</div>
                    <div><strong>Live Pulse Count:</strong> <span style="font-size:1.1rem; color:#d32f2f; font-weight:700;">${dev.counter || 0}</span></div>
                    <div><strong>Last Heartbeat:</strong> ${this.formatTime(dev.update)}</div>
                  </div>

                  <div style="display:flex; gap:8px; margin-top:8px; border-top: 1px dashed rgba(0,0,0,0.1); padding-top:12px;">
                    <md-outlined-button @click=${() => this.resetDeviceCounter(dev.$key)} style="flex:1;">Reset Count</md-outlined-button>
                    <md-icon-button @click=${() => this.removeDevice(dev.$key)}>
                      <md-icon>delete</md-icon>
                    </md-icon-button>
                  </div>
                </div>
              `)}
            </div>
          `}
        </div>
      </div>

      <!-- Add Device Dialog Modal -->
      ${this.showAddDeviceDialog ? html`
        <div class="overlay">
          <div class="dialog">
            <h4>Register Telemetry Hardware</h4>
            
            <div class="form-group">
              <md-outlined-text-field 
                label="Device Identifier Name" 
                .value=${this.newDeviceName}
                @input=${(e: any) => this.newDeviceName = e.target.value}
                required>
              </md-outlined-text-field>

              <md-outlined-select 
                label="Sensor Tech Type" 
                .value=${this.newDeviceType}
                @change=${(e: any) => this.newDeviceType = e.target.value}>
                <md-select-option value="nodeMCU esp8266"><div slot="headline">nodeMCU ESP8266 (Wi-Fi SoC)</div></md-select-option>
                <md-select-option value="IR Sensor"><div slot="headline">Infrared Proximity Counter</div></md-select-option>
                <md-select-option value="RFID scanner"><div slot="headline">RFID Batch Reader</div></md-select-option>
              </md-outlined-select>

              <md-outlined-text-field 
                label="Allocated Machine No. / Key" 
                .value=${this.newDeviceMachine}
                @input=${(e: any) => this.newDeviceMachine = e.target.value}>
              </md-outlined-text-field>
            </div>

            <div class="dialog-actions">
              <md-outlined-button @click=${() => this.showAddDeviceDialog = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.addIoTDevice}>Save Device</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Finish Job Completion Report Modal -->
      ${this.activeJobReportingKey ? html`
        <div class="overlay">
          <div class="dialog">
            <h4>Report Job Run Completion</h4>
            <p style="font-size:0.85rem; color:#666; margin:0;">Please verify actual manufacturing output yields and scrap counts to archive this run:</p>

            <div class="form-group">
              <md-outlined-text-field 
                label="Good / Passed Units" 
                type="number"
                .value=${this.reportingGoodCount.toString()}
                @input=${(e: any) => this.reportingGoodCount = Number(e.target.value)}>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Scrap / Defective Units" 
                type="number"
                .value=${this.reportingDefectCount.toString()}
                @input=${(e: any) => this.reportingDefectCount = Number(e.target.value)}>
              </md-outlined-text-field>
            </div>

            <div class="dialog-actions">
              <md-outlined-button @click=${() => this.activeJobReportingKey = null}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.submitFinishedJobReport}>Archive & Log Run</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-track-production': ViewTrackProduction;
  }
}
