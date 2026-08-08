import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, set } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';

// Material Design 3 Imports
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';

// Chart.js Modular imports
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip);

interface PerformanceData {
  oee?: number;
  aw?: number;
}

@customElement('view-track-performance')
export class ViewTrackPerformance extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .performance-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 800px;
      margin: 0 auto;
    }
    .performance-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .card-title {
      font-size: 1.5rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
      text-align: center;
    }
    .card-subtitle {
      font-size: 1rem;
      color: #666;
      margin: -8px 0 16px 0;
      text-align: center;
    }
    .chart-gauge-container {
      position: relative;
      height: 240px;
      width: 100%;
      max-width: 380px;
      margin-bottom: -40px; /* Offset the bottom half of the circular canvas cutout */
    }
    .gauge-center-text {
      position: absolute;
      top: 60%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .gauge-value {
      font-size: 3rem;
      font-weight: 700;
      color: #202020;
      line-height: 1;
    }
    .gauge-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .kpi-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      width: 100%;
      margin-top: 24px;
    }
    .kpi-item {
      background-color: #fafafa;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.04);
      padding: 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-val {
      font-size: 1.6rem;
      font-weight: 700;
    }
    .kpi-val.status-green { color: #2e7d32; }
    .kpi-val.status-amber { color: #ef6c00; }
    .kpi-val.status-red { color: #c62828; }
    .kpi-title {
      font-size: 0.8rem;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
    }
    .btn-row {
      margin-top: 24px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @query('#oeeGaugeChart') private canvas!: HTMLCanvasElement;

  private chart: Chart | null = null;

  // Real-time Firebase Document Query
  private performanceController = new FirebaseDocController<PerformanceData>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/performanceData` : null
  );

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  override updated(changedProperties: Map<string | symbol, unknown>) {
    super.updated(changedProperties);
    this.renderChart();
  }

  private renderChart() {
    if (!this.canvas || this.performanceController.loading) return;

    const data = this.performanceController.data;
    const oee = typeof data?.oee === 'number' ? Math.max(0, Math.min(100, data.oee)) : 100;

    // Define gauge color bands
    let oeeColor = '#2e7d32'; // Green (Excellent >= 85)
    if (oee < 65) {
      oeeColor = '#c62828'; // Red (Poor < 65)
    } else if (oee < 85) {
      oeeColor = '#ef6c00'; // Amber/Yellow (Acceptable 65 - 85)
    }

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(this.canvas, {
      type: 'doughnut',
      data: {
        labels: ['OEE', 'Unused'],
        datasets: [{
          data: [oee, 100 - oee],
          backgroundColor: [oeeColor, '#eeeeee'],
          borderWidth: 0,
          borderRadius: 4,
          hoverOffset: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90, // Starts at top left semi-circle
        circumference: 180, // Half circle
        cutout: '82%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  private async resetPerformance() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to reset the Overall Equipment Effectiveness (OEE) performance meter back to its 100% baseline?')) {
      try {
        await set(dbRef(db, `/data/${companyKey}/performanceData/oee`), 100);
      } catch (err) {
        console.error('Error resetting OEE performance', err);
      }
    }
  }

  override render() {
    if (this.performanceController.loading) {
      return html`<p style="text-align: center; color: #666; font-style: italic; margin-top: 32px;">Connecting to shopfloor performance monitors...</p>`;
    }

    const data = this.performanceController.data;
    const oee = typeof data?.oee === 'number' ? Math.max(0, Math.min(100, data.oee)) : 100;
    const wasteRatio = typeof data?.aw === 'number' ? data.aw : 0.05; // Acceptable Waste ratio (default 5%)

    // Helper classes for visual readouts
    let statusClass = 'status-green';
    let statusLabel = 'Excellent';
    if (oee < 65) {
      statusClass = 'status-red';
      statusLabel = 'Underperforming';
    } else if (oee < 85) {
      statusClass = 'status-amber';
      statusLabel = 'Target Warning';
    }

    return html`
      <div class="performance-layout">
        <div class="performance-card">
          <h2 class="card-title">Shopfloor Performance Tracking</h2>
          <p class="card-subtitle">Overall Equipment Effectiveness (OEE)</p>

          <div class="chart-gauge-container">
            <canvas id="oeeGaugeChart"></canvas>
            <div class="gauge-center-text">
              <div class="gauge-value">${oee}%</div>
              <div class="gauge-label">OEE</div>
            </div>
          </div>

          <div class="kpi-container">
            <div class="kpi-item">
              <span class="kpi-val ${statusClass}">${statusLabel}</span>
              <span class="kpi-title">Equipment Status</span>
            </div>

            <div class="kpi-item">
              <span class="kpi-val" style="color: #202020;">${(100 - wasteRatio * 100).toFixed(0)}%</span>
              <span class="kpi-title">Material Yield Target</span>
            </div>

            <div class="kpi-item">
              <span class="kpi-val" style="color: #5e35b1;">${(wasteRatio * 100).toFixed(1)}%</span>
              <span class="kpi-title">Yield Defect Tolerance</span>
            </div>
          </div>

          <div class="btn-row">
            <md-outlined-button @click=${this.resetPerformance}>
              <md-icon slot="icon">restart_alt</md-icon>
              Reset Performance Meter
            </md-outlined-button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-track-performance': ViewTrackPerformance;
  }
}