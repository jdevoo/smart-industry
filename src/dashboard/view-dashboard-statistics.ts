import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, set, remove } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';
import { isLeapYear, dateFromDays } from '../utils/date.js';

// ChartJS Modular imports
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip);

interface CommitItem {
  $key: string;
  level: number;
  commit: number;
  dayno: number;
  date: string;
}

@customElement('view-dashboard-statistics')
export class ViewDashboardStatistics extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .stats-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .chart-card, .commit-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.08);
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 500;
      color: #202020;
      margin: 0 0 20px 0;
      text-align: center;
    }
    .chart-canvas-container {
      position: relative;
      height: 320px;
      width: 100%;
    }

    /* GitHub-style Contribution Grid Layout */
    .graph-wrapper {
      overflow-x: auto;
      padding: 16px 0;
    }
    .graph-container {
      display: grid;
      grid-template-areas: 
        "empty months"
        "days squares";
      grid-template-columns: auto 1fr;
      gap: 8px;
      min-width: 720px;
    }
    .months-row {
      grid-area: months;
      display: grid;
      /* Proportion months slots */
      grid-template-columns: repeat(12, 1fr);
      list-style: none;
      padding: 0;
      margin: 0 0 4px 0;
      font-size: 0.75rem;
      color: #666;
    }
    .days-column {
      grid-area: days;
      display: grid;
      grid-template-rows: repeat(7, 10px);
      gap: 3px;
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.7rem;
      color: #666;
      justify-items: end;
      padding-right: 8px;
    }
    .days-column li {
      height: 10px;
      line-height: 10px;
    }
    .squares-grid {
      grid-area: squares;
      display: grid;
      grid-gap: 3px;
      grid-template-rows: repeat(7, 10px);
      grid-auto-flow: column;
      grid-auto-columns: 10px;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .squares-grid li {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      background-color: #ededee;
      position: relative;
    }
    .squares-grid li[data-level="0"] { background-color: #ededee; }
    .squares-grid li[data-level="1"] { background-color: #cce191; }
    .squares-grid li[data-level="2"] { background-color: #8fc575; }
    .squares-grid li[data-level="3"] { background-color: #529646; }
    .squares-grid li[data-level="4"] { background-color: #365f30; }

    /* Custom square tooltip */
    .squares-grid li::before {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 120%;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0,0,0,0.85);
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 10;
    }
    .squares-grid li:hover::before {
      opacity: 1;
    }

    .contrib-legend {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      font-size: 0.8rem;
      color: #666;
    }
    .legend-colors {
      display: flex;
      gap: 3px;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .legend-colors li {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }

    .btn-row {
      display: flex;
      justify-content: center;
      margin-top: 24px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @query('#orderBarChart') private canvas!: HTMLCanvasElement;

  private chart: Chart | null = null;

  // Real-time Queries
  private historyController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/historyData` : null
  );

  private commitController = new FirebaseQueryController<CommitItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/commitData` : null
  );

  override updated() {
    if (this.historyController.data && !this.historyController.loading) {
      this.renderChart();
    }
  }

  private renderChart() {
    const ordersObj = this.historyController.data?.order;
    if (!ordersObj || !this.canvas) return;

    const ordersArr = Object.values(ordersObj) as any[];
    
    // Group and aggregate total orders count by Product Name
    const productCounts: { [name: string]: { qty: number, color: string } } = {};
    ordersArr.forEach(o => {
      const name = o.order_product || 'Unknown Product';
      const color = o.product_color || o.order_color || '#202020';
      if (!productCounts[name]) {
        productCounts[name] = { qty: 0, color };
      }
      productCounts[name].qty += o.order_quantity || 1;
    });

    const labels = Object.keys(productCounts);
    const dataValues = labels.map(l => productCounts[labelMapFix(l)].qty);
    const backgroundColors = labels.map(l => productCounts[labelMapFix(l)].color);

    // Helpers to address JS key loops securely
    function labelMapFix(k: string) { return k; }

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(this.canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  private async resetOrderStatistics() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to reset order statistics charts?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/historyData/order`));
        if (this.chart) this.chart.destroy();
      } catch (err) {
        console.error('Reset order statistics error', err);
      }
    }
  }

  private async resetWorkLevelStatistics() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to reset your overall contribution work statistics calendar?')) {
      try {
        const leap = isLeapYear();
        const totalDays = leap ? 366 : 365;
        const freshCommits = Array.from({ length: totalDays }, (_, i) => ({
          level: 0,
          commit: 0,
          dayno: i + 1,
          date: dateFromDays(i + 1)
        }));
        await set(dbRef(db, `/data/${companyKey}/commitData`), freshCommits);
      } catch (err) {
        console.error('Reset work statistics error', err);
      }
    }
  }

  override render() {
    const commits = this.commitController.data;

    return html`
      <div class="stats-layout">
        <!-- Order statistics bar chart -->
        <div class="chart-card">
          <h3 class="card-title">Product Orders Volume Statistics</h3>
          <div class="chart-canvas-container">
            <canvas id="orderBarChart"></canvas>
          </div>
          <div class="btn-row">
            <md-outlined-button @click=${this.resetOrderStatistics}>Reset Order Statistics</md-outlined-button>
          </div>
        </div>

        <!-- GitHub-style overall contribution tracking work grid -->
        <div class="commit-card">
          <h3 class="card-title">Overall Worksite Contribution Calendar</h3>
          
          <div class="graph-wrapper">
            <div class="graph-container">
              <ul class="months-row">
                <li>Jan</li><li>Feb</li><li>Mar</li><li>Apr</li><li>May</li><li>Jun</li>
                <li>Jul</li><li>Aug</li><li>Sep</li><li>Oct</li><li>Nov</li><li>Dec</li>
              </ul>
              
              <ul class="days-column">
                <li>Sun</li><li>Mon</li><li>Tue</li><li>Wed</li><li>Thu</li><li>Fri</li><li>Sat</li>
              </ul>
              
              <ul class="squares-grid">
                ${commits.map(c => html`
                  <li 
                    data-level=${c.level || 0} 
                    data-tooltip="${c.commit || 0} runs completed on ${c.date || 'N/A'}">
                  </li>
                `)}
              </ul>
            </div>
          </div>

          <div class="contrib-legend">
            <span>Low</span>
            <ul class="legend-colors">
              <li style="background-color: #ededee;"></li>
              <li style="background-color: #cce191;"></li>
              <li style="background-color: #8fc575;"></li>
              <li style="background-color: #529646;"></li>
              <li style="background-color: #365f30;"></li>
            </ul>
            <span>High</span>
          </div>

          <div class="btn-row">
            <md-outlined-button @click=${this.resetWorkLevelStatistics}>Reset Working Statistics</md-outlined-button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-dashboard-statistics': ViewDashboardStatistics;
  }
}
