import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { scheduleDataContext, stationsContext, QueryContextValue } from '../context/dataContexts.js';

// Material Design 3 Imports
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';

interface ScheduleItem {
  $key: string;
  order_no: number;
  order_customer: string;
  order_product: string;
  order_color: string;
  job_part: string;
  job_sku: string;
  job_quantity: number;
  job_status: string;
  job_machine: number | number[];
  job_station: number | number[];
  start: number;
  end: number;
}

interface StationItem {
  $key: string;
  st_name: string;
  st_number: number;
  st_machine?: Array<{ name: string; state?: boolean }>;
}

@customElement('view-plan-production')
export class ViewPlanProduction extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .simulator-card {
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 24px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .simulator-header {
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      padding-bottom: 16px;
    }
    .simulator-title {
      font-size: 1.30rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
    }
    .simulator-desc {
      font-size: 0.85rem;
      color: #666;
      margin: 4px 0 0 0;
    }

    /* Rendering Frame Grid Layout */
    .simulator-frame {
      border: 1px solid rgba(0,0,0,0.08);
      background-color: #f7f7f7;
      border-radius: 8px;
      height: 480px;
      padding: 16px;
      position: relative;
    }

    .simulation-dashboard {
      display: flex;
      gap: 20px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }

    /* Left: Map of workstations */
    .factory-floor {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      padding-right: 8px;
    }

    .workstation-box {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 8px;
      padding: 12px 16px;
      background-color: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .workstation-box.station-active {
      border-color: #2e7d32;
      box-shadow: 0 0 8px rgba(46, 125, 50, 0.08);
    }
    .station-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      border-bottom: 1px dashed rgba(0,0,0,0.06);
      padding-bottom: 6px;
    }
    .station-id {
      font-weight: 700;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 4px;
      background-color: #eee;
      color: #555;
    }
    .station-name {
      font-size: 0.88rem;
      font-weight: 500;
      color: #202020;
    }

    .machines-row {
      display: flex;
      gap: 10px;
      overflow-x: auto;
    }
    .machine-slot {
      flex: 1;
      min-width: 140px;
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 6px;
      padding: 8px;
      background-color: #fafafa;
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }
    .machine-slot.machine-occupied {
      background-color: #ffffff;
      border-color: rgba(0,0,0,0.08);
    }
    .machine-slot.machine-idle {
      opacity: 0.6;
    }
    .machine-icon {
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .machine-slot.machine-occupied .machine-icon {
      animation: pulse-icon 2s infinite ease-in-out;
    }
    @keyframes pulse-icon {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .machine-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .machine-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .machine-status {
      font-size: 0.72rem;
      color: #888;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .machine-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      transition: width 0.1s linear;
    }

    /* Right: Simulation HUD */
    .simulation-hud {
      width: 240px;
      background-color: #fafafa;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.06);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .hud-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      background-color: #ffffff;
      border-radius: 6px;
      padding: 12px;
      border: 1px solid rgba(0,0,0,0.04);
    }
    .clock-hud {
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .hud-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: #888;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .hud-time {
      font-family: monospace;
      font-size: 1.5rem;
      font-weight: 700;
      color: #202020;
      letter-spacing: 0.5px;
      line-height: 1;
    }
    .hud-date {
      font-size: 0.7rem;
      color: #666;
      font-weight: 500;
    }
    .hud-pct {
      font-size: 1.5rem;
      font-weight: 700;
      color: #5e35b1;
    }
    .hud-bar-bg {
      height: 6px;
      background-color: #eee;
      border-radius: 3px;
      overflow: hidden;
      width: 100%;
    }
    .hud-bar-fill {
      height: 100%;
      background-color: #5e35b1;
      transition: width 0.1s linear;
    }

    /* Bottom: Control Panel styling */
    .control-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid rgba(0,0,0,0.08);
      padding-top: 16px;
    }

    .playback-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }

    .scrub-track-container {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .slider-input {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      outline: none;
      background-color: #eee;
      -webkit-appearance: none;
      cursor: pointer;
    }
    .slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: #202020;
      cursor: pointer;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .time-label {
      font-family: monospace;
      font-size: 0.75rem;
      color: #555;
      min-width: 60px;
      text-align: center;
    }

    .btn-group {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
    }
    .btn-group md-outlined-button,
    .btn-group md-filled-button {
      max-width: 100%;
    }
    @media (max-width: 600px) {
      .btn-group {
        flex-direction: column;
      }
      .btn-group md-outlined-button,
      .btn-group md-filled-button {
        width: 100%;
      }
    }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.85rem;
      color: #444;
    }

    [hidden] {
      display: none !important;
    }
  `;

  @consume({ context: scheduleDataContext, subscribe: true })
  @state()
  private scheduleDataState!: QueryContextValue<ScheduleItem>;

  @consume({ context: stationsContext, subscribe: true })
  @state()
  private stationsState!: QueryContextValue<StationItem>;

  // Playback state variables
  @state() private isPlaying = false;
  @state() private currentTimeSeconds = 0;
  @state() private speedMultiplier = 600; // default 600x timeline speed

  // Calculated boundaries
  @state() private startTimeSeconds = 0;
  @state() private endTimeSeconds = 0;
  @state() private totalTimelineSeconds = 0;

  private lastAnimFrame: number | null = null;
  private lastTimestamp: number | null = null;

  override disconnectedCallback() {
    this.stopAnimation();
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string | symbol, unknown>) {
    super.updated(changedProperties);

    const jobs = this.scheduleDataState.data || [];
    if (jobs.length > 0 && (this.startTimeSeconds === 0 || changedProperties.has('authState'))) {
      let minStart = Infinity;
      let maxEnd = -Infinity;
      jobs.forEach(job => {
        if (job.start < minStart) minStart = job.start;
        if (job.end > maxEnd) maxEnd = job.end;
      });

      if (minStart !== Infinity) {
        this.startTimeSeconds = minStart;
        this.endTimeSeconds = maxEnd;
        this.totalTimelineSeconds = maxEnd - minStart;
        if (this.currentTimeSeconds === 0 || this.currentTimeSeconds < minStart || this.currentTimeSeconds > maxEnd) {
          this.currentTimeSeconds = minStart;
        }
      }
    }
  }

  private togglePlayback() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.stopAnimation();
    } else {
      const jobs = this.scheduleDataState.data || [];
      if (jobs.length === 0) {
        alert("Please run scheduling on the 'Scheduling' tab before running simulations.");
        return;
      }
      if (this.currentTimeSeconds >= this.endTimeSeconds) {
        this.currentTimeSeconds = this.startTimeSeconds;
      }
      this.isPlaying = true;
      this.lastTimestamp = null;
      this.lastAnimFrame = requestAnimationFrame((t) => this.animLoop(t));
    }
  }

  private resetPlayback() {
    this.isPlaying = false;
    this.stopAnimation();
    this.currentTimeSeconds = this.startTimeSeconds;
  }

  private stopAnimation() {
    if (this.lastAnimFrame !== null) {
      cancelAnimationFrame(this.lastAnimFrame);
      this.lastAnimFrame = null;
    }
    this.lastTimestamp = null;
  }

  private animLoop(timestamp: number) {
    if (!this.isPlaying) return;
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;

    const elapsedRealSeconds = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    let nextTime = this.currentTimeSeconds + (elapsedRealSeconds * this.speedMultiplier);

    if (nextTime >= this.endTimeSeconds) {
      nextTime = this.endTimeSeconds;
      this.isPlaying = false;
      this.stopAnimation();
      alert("Simulation has successfully run to completion!");
    }

    this.currentTimeSeconds = nextTime;
    this.lastAnimFrame = requestAnimationFrame((t) => this.animLoop(t));
  }

  private handleScrubInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    this.currentTimeSeconds = value;
  }

  private handleSpeedInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    this.speedMultiplier = value;
  }

  private formatClockTime(timestamp: number): string {
    if (!timestamp) return '00:00:00';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private formatClockDate(timestamp: number): string {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }

  override render() {
    if (this.scheduleDataState.loading || this.stationsState.loading) {
      return html`
        <div class="simulator-card">
          <h3 class="simulator-title">Production Simulator</h3>
          <p style="text-align: center; font-style: italic; color: #888; padding: 48px 0;">Loading simulation configurations...</p>
        </div>
      `;
    }

    const jobs = this.scheduleDataState.data || [];
    const stations = this.stationsState.data || [];
    const hasData = jobs.length > 0 && this.totalTimelineSeconds > 0;

    // Filter jobs active at the current simulation clock time
    const activeJobsList = jobs.filter(job => this.currentTimeSeconds >= job.start && this.currentTimeSeconds < job.end);
    const overallProgress = hasData ? ((this.currentTimeSeconds - this.startTimeSeconds) / this.totalTimelineSeconds) * 100 : 0;

    return html`
      <div class="simulator-card">
        <div class="simulator-header">
          <h3 class="simulator-title">Production Simulator</h3>
          <p class="simulator-desc">Interactive chronological flow playback of scheduled bedding manufacturing jobs across factory workstations.</p>
        </div>

        <!-- Simulator Render Area -->
        <div class="simulator-frame">
          ${!hasData ? html`
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; color:#888; font-style:italic; gap:12px;">
              <md-icon style="font-size: 48px; width:48px; height:48px; color:rgba(0,0,0,0.15)">precision_manufacturing</md-icon>
              <span>No compiled schedule has been detected. Run the rescheduling algorithm under 'Scheduling' to compile simulations.</span>
            </div>
          ` : html`
            <div class="simulation-dashboard">
              
              <!-- Left: Station Machine Occupancy Map -->
              <div class="factory-floor">
                ${stations.map(st => {
                  // Find if there is a job active at this station right now
                  const activeJobAtStation = activeJobsList.find(job => {
                    const matchStation = Array.isArray(job.job_station)
                      ? job.job_station.includes(st.st_number)
                      : job.job_station === st.st_number;
                    return matchStation;
                  });

                  const machinesList = st.st_machine || [{ name: 'Default Machine', state: true }];

                  return html`
                    <div class="workstation-box ${activeJobAtStation ? 'station-active' : ''}">
                      <div class="station-meta">
                        <span class="station-id">ST-${st.st_number}</span>
                        <span class="station-name">${st.st_name}</span>
                      </div>

                      <div class="machines-row">
                        ${machinesList.map((m) => {
                          // Occupy machine slot if there's an active run
                          const isMachineOccupied = activeJobAtStation && m.state !== false;
                          const jobProgress = activeJobAtStation
                            ? ((this.currentTimeSeconds - activeJobAtStation.start) / (activeJobAtStation.end - activeJobAtStation.start)) * 100
                            : 0;

                          return html`
                            <div class="machine-slot ${isMachineOccupied ? 'machine-occupied' : 'machine-idle'}">
                              <div class="machine-icon">
                                <md-icon style="font-size:18px;">${isMachineOccupied ? 'precision_manufacturing' : 'power_settings_new'}</md-icon>
                              </div>
                              <div class="machine-details">
                                <span class="machine-name">${m.name}</span>
                                <span class="machine-status">
                                  ${isMachineOccupied ? html`
                                    <span style="color: ${activeJobAtStation.order_color || '#202020'}; font-weight:700;">
                                      #${activeJobAtStation.order_no} (${jobProgress.toFixed(0)}%)
                                    </span>
                                  ` : 'Idle'}
                                </span>
                              </div>
                              ${isMachineOccupied ? html`
                                <div class="machine-progress-bar" style="background-color: ${activeJobAtStation.order_color || '#202020'}; width: ${jobProgress}%;"></div>
                              ` : ''}
                            </div>
                          `;
                        })}
                      </div>
                    </div>
                  `;
                })}
              </div>

              <!-- Right: Live Statistics HUD Panel -->
              <div class="simulation-hud">
                <div class="hud-item clock-hud">
                  <span class="hud-label">Simulation Clock</span>
                  <span class="hud-time">${this.formatClockTime(this.currentTimeSeconds)}</span>
                  <span class="hud-date">${this.formatClockDate(this.currentTimeSeconds)}</span>
                </div>

                <div class="hud-item">
                  <span class="hud-label">Shift Completion</span>
                  <span class="hud-pct">${overallProgress.toFixed(1)}%</span>
                  <div class="hud-bar-bg">
                    <div class="hud-bar-fill" style="width: ${overallProgress}%;"></div>
                  </div>
                </div>

                <div class="hud-item" style="flex: 1; display:flex; flex-direction:column; min-height:0;">
                  <span class="hud-label" style="margin-bottom:8px;">Active Operations</span>
                  <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; font-size:0.8rem;">
                    ${activeJobsList.length === 0 ? html`
                      <span style="color:#888; font-style:italic; text-align:center; margin-top:20px;">Idle (No active runs)</span>
                    ` : activeJobsList.map(job => html`
                      <div style="border-left: 3px solid ${job.order_color || '#202020'}; padding-left: 8px; display:flex; flex-direction:column; gap:2px;">
                        <span style="font-weight:700; color:#202020;">#${job.order_no}: ${job.order_customer}</span>
                        <span style="color:#555; font-size:0.75rem;">Part: ${job.job_part}</span>
                        <span style="color:#888; font-size:0.72rem;">Target: ${job.job_quantity} units</span>
                      </div>
                    `)}
                  </div>
                </div>
              </div>

            </div>
          `}
        </div>

        <!-- Playback Control Slider and Inputs -->
        <div class="control-panel">
          <!-- Time-Scrub Slider track -->
          <div class="playback-row">
            <div class="scrub-track-container">
              <span class="time-label">${this.formatClockTime(this.startTimeSeconds)}</span>
              <input 
                type="range" 
                class="slider-input" 
                .min=${this.startTimeSeconds.toString()}
                .max=${this.endTimeSeconds.toString()}
                .value=${this.currentTimeSeconds.toString()}
                @input=${this.handleScrubInput}
                ?disabled=${!hasData}>
              <span class="time-label">${this.formatClockTime(this.endTimeSeconds)}</span>
            </div>
          </div>

          <!-- Actions Buttons and Speed Controller multiplier -->
          <div class="playback-row" style="margin-top: 4px;">
            <div class="btn-group">
              <md-filled-button @click=${this.togglePlayback} ?disabled=${!hasData} style="min-width:140px;">
                <md-icon slot="icon">${this.isPlaying ? 'pause' : 'play_arrow'}</md-icon>
                ${this.isPlaying ? 'Pause' : 'Start Playback'}
              </md-filled-button>

              <md-outlined-button @click=${this.resetPlayback} ?disabled=${!hasData}>
                <md-icon slot="icon">restart_alt</md-icon>
                Reset
              </md-outlined-button>
            </div>

            <!-- Speed multiplier slider -->
            <div class="slider-row">
              <span>Playback Speed:</span>
              <input 
                type="range" 
                class="slider-input" 
                style="width: 140px;"
                min="60" 
                max="3600" 
                step="60"
                .value=${this.speedMultiplier.toString()}
                @input=${this.handleSpeedInput}
                ?disabled=${!hasData}>
              <span style="font-family:monospace; font-weight:700; min-width: 48px;">
                x${(this.speedMultiplier / 60).toFixed(0)}m/s
              </span>
            </div>
          </div>
        </div>

      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-plan-production': ViewPlanProduction;
  }
}