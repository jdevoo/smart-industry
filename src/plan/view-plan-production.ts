import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

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
    .simulator-title {
      font-size: 1.3rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
    }
    .simulator-frame {
      border: 1px dashed rgba(0,0,0,0.15);
      background-color: #fafafa;
      border-radius: 8px;
      height: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
      font-style: italic;
    }
    .btn-group {
      display: flex;
      justify-content: center;
      gap: 16px;
    }
  `;

  override render() {
    return html`
      <div class="simulator-card">
        <h3 class="simulator-title">Production Simulator</h3>
        <div class="simulator-frame">
          Simulation sequencing graphics engine (Future Release)
        </div>
        <div class="btn-group">
          <md-filled-button disabled>
            <md-icon slot="icon">play_arrow</md-icon> Start Simulation
          </md-filled-button>
          <md-outlined-button disabled>Edit Simulator</md-outlined-button>
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
