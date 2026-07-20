import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, set, update } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';

// Material Design 3 UI Imports
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

@customElement('view-setup-factory')
export class ViewSetupFactory extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .form-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

  // Local working copy fields for edits
  @state() private model = 'serial';
  @state() private concurrency = 1;
  @state() private aw = 0.05; // acceptable waste (e.g. 5%)
  @state() private interval = 30; // default intervals
  @state() private start_interval = 480; // work shift start timestamp (e.g. 08:00 in minutes)

  // Subscriptions to profile, performance, and schedule nodes
  private profileController = new FirebaseDocController(this, () => 
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/profile` : null
  );

  private performanceController = new FirebaseDocController(this, () => 
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/performance` : null
  );

  private scheduleController = new FirebaseDocController(this, () => 
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/schedule` : null
  );

  override updated() {
    // When Firebase data loads, initialize working inputs
    if (this.profileController.data && !this.profileController.loading) {
      const p = this.profileController.data;
      if (p.model !== undefined) this.model = p.model;
      if (p.concurrency !== undefined) this.concurrency = parseInt(p.concurrency) || 1;
    }
    if (this.performanceController.data && !this.performanceController.loading) {
      const perf = this.performanceController.data;
      if (perf.aw !== undefined) this.aw = parseFloat(perf.aw) || 0;
    }
    if (this.scheduleController.data && !this.scheduleController.loading) {
      const sched = this.scheduleController.data;
      if (sched.interval !== undefined) this.interval = parseInt(sched.interval) || 30;
      if (sched.start_interval !== undefined) this.start_interval = parseInt(sched.start_interval) || 480;
    }
  }

  private async saveSettings() {
    this.saveSuccess = false;
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    try {
      // Save profile node
      await set(dbRef(db, `/data/${companyKey}/factoryData/profile`), {
        model: this.model,
        concurrency: Number(this.concurrency)
      });

      // Save performance node
      await update(dbRef(db, `/data/${companyKey}/factoryData/performance`), {
        aw: Number(this.aw)
      });

      // Save schedule configurations
      await set(dbRef(db, `/data/${companyKey}/factoryData/schedule`), {
        interval: Number(this.interval),
        start_interval: Number(this.start_interval)
      });

      this.saveSuccess = true;
      setTimeout(() => this.saveSuccess = false, 4000);
    } catch (err) {
      console.error('Error saving factory settings', err);
    }
  }

  override render() {
    if (this.profileController.loading || this.performanceController.loading || this.scheduleController.loading) {
      return html`<p>Loading Factory Configurations...</p>`;
    }

    return html`
      <div class="form-layout">
        <!-- Production Line Model Setup -->
        <div class="card-section">
          <h3 class="card-title">Production Line Flow</h3>
          <md-outlined-select 
            label="Flow Model Type" 
            .value=${this.model} 
            @change=${(e: any) => this.model = e.target.value}>
            <md-select-option value="serial">
              <div slot="headline">Serial (Single Path)</div>
            </md-select-option>
            <md-select-option value="parallel">
              <div slot="headline">Parallel (Concurrent Batch Processing)</div>
            </md-select-option>
            <md-select-option value="multi">
              <div slot="headline">Multi-Part Assembly Line</div>
            </md-select-option>
          </md-outlined-select>

          ${this.model === 'parallel' ? html`
            <md-outlined-text-field 
              label="Concurrency (Machine Lines)" 
              type="number" 
              .value=${this.concurrency.toString()}
              @input=${(e: any) => this.concurrency = Number(e.target.value)}>
            </md-outlined-text-field>
          ` : ''}
        </div>

        <!-- Scrap/Performance Settings -->
        <div class="card-section">
          <h3 class="card-title">Shopfloor Waste Metrics</h3>
          <md-outlined-text-field 
            label="Acceptable Waste (AW Ratio)" 
            type="number" 
            step="0.01"
            min="0"
            max="1"
            helperText="E.g., 0.05 represents a 5% allowable waste/scrap buffer"
            .value=${this.aw.toString()}
            @input=${(e: any) => this.aw = Number(e.target.value)}>
          </md-outlined-text-field>
        </div>

        <!-- Shift & Interval Parameters -->
        <div class="card-section">
          <h3 class="card-title">Operational Shift Timeline</h3>
          <md-outlined-text-field 
            label="Scheduling Time Block Interval (mins)" 
            type="number" 
            .value=${this.interval.toString()}
            @input=${(e: any) => this.interval = Number(e.target.value)}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="Shift Start Offset (mins from midnight)" 
            type="number" 
            helperText="E.g., 480 represents an 08:00 AM start time"
            .value=${this.start_interval.toString()}
            @input=${(e: any) => this.start_interval = Number(e.target.value)}>
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
