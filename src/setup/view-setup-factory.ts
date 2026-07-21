import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, update, set } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';

// Material Design 3 UI Imports
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/checkbox/checkbox.js';

@customElement('view-setup-factory')
export class ViewSetupFactory extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .form-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    .card-section {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 24px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 500;
      color: #202020;
      margin: 0 0 4px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 12px;
    }
    md-outlined-text-field, md-outlined-select {
      width: 100%;
    }
    
    .days-container {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 8px;
      background-color: #fafafa;
    }
    .day-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      color: #444;
    }

    .submit-bar {
      display: flex;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
    }
    .status-alert {
      padding: 12px 16px;
      border-radius: 6px;
      margin-top: 16px;
      font-size: 0.95rem;
      text-align: center;
    }
    .status-success {
      background-color: #eafaf1;
      color: #2e7d32;
      border: 1px solid #c3e6cb;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private saveSuccess = false;

  // Local working fields mapping to database nodes
  @state() private factoryName = '';
  @state() private factoryType = 'jobshop';
  @state() private model = 'serial';
  @state() private concurrency = 2;

  @state() private op_start = '08:00';
  @state() private op_end = '17:00';
  @state() private ot_start = '19:00';
  @state() private ot_end = '21:00';
  
  // Active operating days checkboxes
  @state() private opDays: Record<string, boolean> = {
    sun: false, mon: true, tue: true, wed: true, thu: true, fri: true, sat: false
  };

  @state() private optimize = 'disabled';
  @state() private au = 85; // acceptable utilization %
  @state() private meff = 75; // machine standard efficiency %
  @state() private aw = 0.02; // acceptable waste ratio (0.00 - 1.00)

  @state() private interval = 1; // reschedule interval in days
  @state() private delay = 10; // WIP delay between stations in minutes

  // Subscriptions to factory database nodes
  private profileController = new FirebaseDocController(this, () => 
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/profile` : null
  );

  private operationController = new FirebaseDocController(this, () => 
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/operation` : null
  );

  private performanceController = new FirebaseDocController(this, () => 
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/performance` : null
  );

  private scheduleController = new FirebaseDocController(this, () => 
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/schedule` : null
  );

  override updated() {
    // Sync UI fields when firebase data resolved
    if (this.profileController.data && !this.profileController.loading) {
      const p = this.profileController.data;
      if (p.name !== undefined) this.factoryName = p.name;
      if (p.type !== undefined) this.factoryType = p.type;
      if (p.model !== undefined) this.model = p.model;
      if (p.concurrency !== undefined) this.concurrency = parseInt(p.concurrency) || 2;
    }

    if (this.operationController.data && !this.operationController.loading) {
      const op = this.operationController.data;
      if (op.op_start !== undefined) this.op_start = op.op_start;
      if (op.op_end !== undefined) this.op_end = op.op_end;
      if (op.ot_start !== undefined) this.ot_start = op.ot_start;
      if (op.ot_end !== undefined) this.ot_end = op.ot_end;
      if (op.op_day !== undefined) {
        const days = op.op_day.split(',');
        const newDays: Record<string, boolean> = {
          sun: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false
        };
        days.forEach((d: string) => {
          if (d) newDays[d] = true;
        });
        this.opDays = newDays;
      }
    }

    if (this.performanceController.data && !this.performanceController.loading) {
      const perf = this.performanceController.data;
      if (perf.optimize !== undefined) this.optimize = perf.optimize;
      if (perf.au !== undefined) this.au = parseInt(perf.au) || 85;
      if (perf.meff !== undefined) this.meff = parseInt(perf.meff) || 75;
      if (perf.aw !== undefined) this.aw = parseFloat(perf.aw) || 0.02;
    }

    if (this.scheduleController.data && !this.scheduleController.loading) {
      const sched = this.scheduleController.data;
      if (sched.interval !== undefined) this.interval = parseInt(sched.interval) || 1;
      if (sched.delay !== undefined) this.delay = parseInt(sched.delay) || 10;
    }
  }

  private handleDayChange(day: string, checked: boolean) {
    this.opDays = { ...this.opDays, [day]: checked };
  }

  private async saveSettings() {
    this.saveSuccess = false;
    const companyKey = this.authState.profile?.key;
    const uid = this.authState.user?.uid;
    if (!companyKey || !uid) return;

    // Combine day selection state back to CSV
    const op_day = Object.entries(this.opDays)
      .filter(([_, active]) => active)
      .map(([day]) => day)
      .join(',');

    try {
      // 1. Save profile node
      await set(dbRef(db, `/data/${companyKey}/factoryData/profile`), {
        name: this.factoryName || 'Untitled Factory',
        type: this.factoryType,
        model: this.model,
        concurrency: Number(this.concurrency)
      });

      // 2. Save operation node
      await set(dbRef(db, `/data/${companyKey}/factoryData/operation`), {
        op_start: this.op_start,
        op_end: this.op_end,
        ot_start: this.ot_start,
        ot_end: this.ot_end,
        op_day,
        ot_day: 'sat' // original fallback
      });

      // 3. Save performance node
      await set(dbRef(db, `/data/${companyKey}/factoryData/performance`), {
        optimize: this.optimize,
        au: Number(this.au),
        meff: Number(this.meff),
        aw: Number(this.aw)
      });

      // 4. Save schedule configurations
      await update(dbRef(db, `/data/${companyKey}/factoryData/schedule`), {
        interval: Number(this.interval),
        delay: Number(this.delay)
      });

      // 5. Explicitly flag setup complete inside profile node
      await update(dbRef(db, `/user/${uid}`), { setup: true });

      this.saveSuccess = true;
      setTimeout(() => this.saveSuccess = false, 4000);
      alert('Factory Topology configurations updated successfully!');
    } catch (err) {
      console.error('Error saving factory settings', err);
    }
  }

  override render() {
    if (
      this.profileController.loading || 
      this.operationController.loading || 
      this.performanceController.loading || 
      this.scheduleController.loading
    ) {
      return html`<p>Retrieving Factory Topology configurations...</p>`;
    }

    return html`
      <div class="form-layout">
        <!-- Section 1: Factory Identity & Model -->
        <div class="card-section">
          <h3 class="card-title">Factory Profile & Flow</h3>
          
          <md-outlined-text-field 
            label="Factory Name" 
            .value=${this.factoryName}
            @input=${(e: any) => this.factoryName = e.target.value}
            required>
          </md-outlined-text-field>

          <md-outlined-select 
            label="Manufacturing Layout Type" 
            .value=${this.factoryType} 
            @change=${(e: any) => this.factoryType = e.target.value}>
            <md-select-option value="jobshop">
              <div slot="headline">Job Shop Manufacturer</div>
            </md-select-option>
          </md-outlined-select>

          <md-outlined-select 
            label="Production Line Flow Model" 
            .value=${this.model} 
            @change=${(e: any) => this.model = e.target.value}>
            <md-select-option value="serial">
              <div slot="headline">Serial (Single Path)</div>
            </md-select-option>
            <md-select-option value="parallel">
              <div slot="headline">Parallel (Concurrent Lines)</div>
            </md-select-option>
            <md-select-option value="multi">
              <div slot="headline">Multi-Part Assembly Line</div>
            </md-select-option>
          </md-outlined-select>

          ${this.model === 'parallel' ? html`
            <md-outlined-text-field 
              label="Station Concurrency (Machine Lines)" 
              type="number" 
              min="2"
              max="10"
              .value=${this.concurrency.toString()}
              @input=${(e: any) => this.concurrency = Number(e.target.value)}>
            </md-outlined-text-field>
          ` : ''}
        </div>

        <!-- Section 2: Shift Timeline & Work Days -->
        <div class="card-section">
          <h3 class="card-title">Daily Shift Operational Timeline</h3>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <md-outlined-text-field 
              label="Shift Start" 
              type="time" 
              .value=${this.op_start}
              @change=${(e: any) => this.op_start = e.target.value}>
            </md-outlined-text-field>

            <md-outlined-text-field 
              label="Shift End" 
              type="time" 
              .value=${this.op_end}
              @change=${(e: any) => this.op_end = e.target.value}>
            </md-outlined-text-field>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <md-outlined-text-field 
              label="Overtime Start" 
              type="time" 
              .value=${this.ot_start}
              @change=${(e: any) => this.ot_start = e.target.value}>
            </md-outlined-text-field>

            <md-outlined-text-field 
              label="Overtime End" 
              type="time" 
              .value=${this.ot_end}
              @change=${(e: any) => this.ot_end = e.target.value}>
            </md-outlined-text-field>
          </div>

          <div>
            <p style="font-size:0.85rem; color:#666; margin: 0 0 8px 0; font-weight:500;">Weekly Operating Days</p>
            <div class="days-container">
              ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => html`
                <div class="day-item">
                  <md-checkbox 
                    id="chk-${day}"
                    ?checked=${this.opDays[day]}
                    @change=${(e: any) => this.handleDayChange(day, e.target.checked)}>
                  </md-checkbox>
                  <label for="chk-${day}" style="text-transform: capitalize;">${day}</label>
                </div>
              `)}
            </div>
          </div>
        </div>

        <!-- Section 3: Performance Standards & Waste -->
        <div class="card-section">
          <h3 class="card-title">Productivity & Efficiency Standards</h3>

          <md-outlined-select 
            label="Productivity Optimization Strategy" 
            .value=${this.optimize} 
            @change=${(e: any) => this.optimize = e.target.value}>
            <md-select-option value="disabled">
              <div slot="headline">No Optimization (Heuristics Only)</div>
            </md-select-option>
            <md-select-option value="increase-profit">
              <div slot="headline">Increase Profit (Constraint Solving)</div>
            </md-select-option>
            <md-select-option value="reduce-cost">
              <div slot="headline">Reduce Cost (Constraint Solving)</div>
            </md-select-option>
          </md-outlined-select>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <md-outlined-text-field 
              label="Acceptable Utilization" 
              type="number" 
              suffixText="%"
              min="30"
              max="100"
              .value=${this.au.toString()}
              @input=${(e: any) => this.au = Number(e.target.value)}>
            </md-outlined-text-field>

            <md-outlined-text-field 
              label="Standard Machine Eff." 
              type="number" 
              suffixText="%"
              min="30"
              max="100"
              .value=${this.meff.toString()}
              @input=${(e: any) => this.meff = Number(e.target.value)}>
            </md-outlined-text-field>
          </div>

          <md-outlined-text-field 
            label="Acceptable Waste (AW Ratio)" 
            type="number" 
            step="0.01"
            min="0.00"
            max="1.00"
            helperText="Ratio of acceptable scrap allocation (e.g. 0.02 = 2% scrap)"
            .value=${this.aw.toString()}
            @input=${(e: any) => this.aw = Number(e.target.value)}>
          </md-outlined-text-field>
        </div>

        <!-- Section 4: Scheduling & Intervals -->
        <div class="card-section">
          <h3 class="card-title">Planning & Rescheduling Rules</h3>

          <md-outlined-select 
            label="Default Rescheduling Cycle" 
            .value=${this.interval.toString()} 
            @change=${(e: any) => this.interval = Number(e.target.value)}>
            ${[1, 2, 3, 4, 5, 6, 7].map(i => html`
              <md-select-option value=${i.toString()}>
                <div slot="headline">Every ${i} ${i === 1 ? 'Day' : 'Days'}</div>
              </md-select-option>
            `)}
          </md-outlined-select>

          <md-outlined-text-field 
            label="WIP Inter-Station Delay (minutes)" 
            type="number" 
            min="0"
            max="180"
            helperText="Travel and setup safety delay allowed between workstation shifts"
            .value=${this.delay.toString()}
            @input=${(e: any) => this.delay = Number(e.target.value)}>
          </md-outlined-text-field>
        </div>
      </div>

      <div class="submit-bar">
        <md-filled-button @click=${this.saveSettings}>Save Settings</md-filled-button>
      </div>

      ${this.saveSuccess ? html`
        <div class="status-alert status-success">
          Factory configuration successfully synced with Realtime Database.
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-setup-factory': ViewSetupFactory;
  }
}
