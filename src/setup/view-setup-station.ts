import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, push, set, remove, update } from 'firebase/database';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseQueryController } from '../controllers/FirebaseQueryController.js';

// Material Design 3 UI Imports
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

interface SimpleMachineInfo {
  mid: string;
  name: string;
  number: number;
}

interface StationItem {
  $key: string;
  st_name: string;
  st_number: number;
  st_install: number;
  st_machine?: SimpleMachineInfo[];
}

interface MachineItem {
  $key: string;
  name: string;
  number: number;
  state?: boolean;
}

@customElement('view-setup-station')
export class ViewSetupStation extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .station-workspace {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      padding-bottom: 16px;
    }
    .header-bar h3 {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
    }
    
    /* Station Cards Grid */
    .station-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .station-card {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .station-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 10px;
    }
    .station-title {
      font-weight: 500;
      font-size: 1.15rem;
      margin: 0;
      color: #202020;
    }
    .station-meta {
      font-size: 0.8rem;
      color: #666;
      margin-top: 2px;
    }
    .machine-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .machine-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #f5f5f5;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      border: 1px solid rgba(0,0,0,0.04);
    }
    .machine-badge-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .machine-avatar {
      background-color: #202020;
      color: #ffffff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: bold;
    }

    .station-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: auto;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 12px;
    }

    /* Editor Overlay */
    .editor-overlay {
      position: fixed;
      top: 0; right: 0; bottom: 0; left: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .editor-dialog {
      background: #ffffff;
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .editor-dialog h4 {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .machine-assignment-sec {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .machine-assign-title {
      font-weight: 500;
      font-size: 0.95rem;
      margin: 0 0 4px 0;
      color: #202020;
    }
    .assignment-controls {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .assigned-machines-draft {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 160px;
      overflow-y: auto;
    }
    .draft-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #fcfcfc;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 0.85rem;
    }
    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 16px;
    }
    md-outlined-text-field, md-outlined-select {
      width: 100%;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private showEditor = false;
  @state() private editingKey: string | null = null;

  // Editor Form Fields
  @state() private editName = '';
  @state() private editNumber = 1;
  @state() private draftMachines: SimpleMachineInfo[] = [];
  @state() private selectedMachineKeyToAssign = '';

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
    if (e.key === 'Escape' && this.showEditor) {
      this.showEditor = false;
    }
  }

  // Controllers
  private stationsController = new FirebaseQueryController<StationItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/station` : null
  );

  private machinesController = new FirebaseQueryController<MachineItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/machine` : null
  );

  private openAddDialog() {
    this.editingKey = null;
    this.editName = '';
    const currentMax = this.stationsController.data.reduce((max, item) => item.st_number > max ? item.st_number : max, 0);
    this.editNumber = currentMax + 1;
    this.draftMachines = [];
    this.selectedMachineKeyToAssign = '';
    this.showEditor = true;
  }

  private openEditDialog(station: StationItem) {
    this.editingKey = station.$key;
    this.editName = station.st_name || '';
    this.editNumber = station.st_number || 1;
    this.draftMachines = station.st_machine ? [...station.st_machine] : [];
    this.selectedMachineKeyToAssign = '';
    this.showEditor = true;
  }

  private async deleteStation(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to delete this station? All machine associations inside it will be severed.')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/factoryData/station/${key}`));
      } catch (err) {
        console.error('Failed to remove station', err);
      }
    }
  }

  private addMachineToDraft() {
    if (!this.selectedMachineKeyToAssign) return;

    // Find full machine item in our list controller
    const machine = this.machinesController.data.find(m => m.$key === this.selectedMachineKeyToAssign);
    if (!machine) return;

    // Check if already assigned to draft
    if (this.draftMachines.some(m => m.mid === machine.$key)) {
      alert('This machine is already assigned to this workstation.');
      return;
    }

    this.draftMachines = [...this.draftMachines, {
      mid: machine.$key,
      name: machine.name,
      number: machine.number
    }];
    this.selectedMachineKeyToAssign = '';
  }

  private removeMachineFromDraft(mid: string) {
    this.draftMachines = this.draftMachines.filter(m => m.mid !== mid);
  }

  private async saveStation() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (!this.editName) {
      alert('Station Name is required');
      return;
    }

    const payload = {
      st_name: this.editName,
      st_number: Number(this.editNumber),
      st_install: Math.round(Date.now() / 1000),
      st_machine: this.draftMachines
    };

    try {
      if (this.editingKey) {
        // Edit Mode
        await update(dbRef(db, `/data/${companyKey}/factoryData/station/${this.editingKey}`), payload);
      } else {
        // Add Mode
        const newStationRef = push(dbRef(db, `/data/${companyKey}/factoryData/station`));
        await set(newStationRef, payload);
      }
      this.showEditor = false;
    } catch (err) {
      console.error('Error saving station configurations', err);
    }
  }

  override render() {
    if (this.stationsController.loading || this.machinesController.loading) {
      return html`<p>Loading Station Topology...</p>`;
    }

    const stations = this.stationsController.data;
    const availableMachines = this.machinesController.data.filter(m => m.state !== false); // Only active machinery (defaults to true if undefined)

    return html`
      <div class="station-workspace">
        <div class="header-bar">
          <h3>Workstation Registry</h3>
          <md-filled-button @click=${this.openAddDialog}>
            <md-icon slot="icon">add</md-icon>
            Add Workstation
          </md-filled-button>
        </div>

        ${stations.length === 0 ? html`
          <p>No workstations configured inside this factory yet. Click 'Add Workstation' to build your assembly routing.</p>
        ` : html`
          <div class="station-grid">
            ${stations.map(station => html`
              <div class="station-card">
                <div class="station-header">
                  <div>
                    <h4 class="station-title">${station.st_name}</h4>
                    <p class="station-meta">Station Code: ST-${station.st_number}</p>
                  </div>
                </div>

                <div class="machine-list">
                  <span style="font-size: 0.8rem; font-weight: 500; color: #666; margin-bottom: 4px;">Assigned Machinery:</span>
                  ${!station.st_machine || station.st_machine.length === 0 ? html`
                    <p style="font-size: 0.85rem; color: #888; font-style: italic; margin: 0;">No machines allocated to this station.</p>
                  ` : station.st_machine.map(machine => html`
                    <div class="machine-badge">
                      <div class="machine-badge-left">
                        <span class="machine-avatar">${machine.number}</span>
                        <span>${machine.name}</span>
                      </div>
                    </div>
                  `)}
                </div>

                <div class="station-actions">
                  <md-icon-button @click=${() => this.openEditDialog(station)}>
                    <md-icon>edit</md-icon>
                  </md-icon-button>
                  <md-icon-button @click=${() => this.deleteStation(station.$key)}>
                    <md-icon>delete</md-icon>
                  </md-icon-button>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>

      <!-- Station Overlay Dialog -->
      ${this.showEditor ? html`
        <div class="editor-overlay">
          <div class="editor-dialog">
            <h4>${this.editingKey ? 'Modify Station Setup' : 'Register New Workstation'}</h4>

            <div class="form-group">
              <md-outlined-text-field 
                label="Station Name" 
                .value=${this.editName}
                @input=${(e: any) => this.editName = e.target.value}
                required>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Station Sequence Number" 
                type="number"
                .value=${this.editNumber.toString()}
                @input=${(e: any) => this.editNumber = Number(e.target.value)}>
              </md-outlined-text-field>

              <div class="machine-assignment-sec">
                <h5 class="machine-assign-title">Allocate Machinery</h5>
                <div class="assignment-controls">
                  <md-outlined-select 
                    label="Select Machine" 
                    .value=${this.selectedMachineKeyToAssign}
                    style="flex: 1"
                    @change=${(e: any) => this.selectedMachineKeyToAssign = e.target.value}>
                    <md-select-option value="">
                      <div slot="headline">-- Select Active Asset --</div>
                    </md-select-option>
                    ${availableMachines.map(m => html`
                      <md-select-option value=${m.$key}>
                        <div slot="headline">#${m.number} - ${m.name}</div>
                      </md-select-option>
                    `)}
                  </md-outlined-select>
                  <md-outlined-button style="height: 56px;" @click=${this.addMachineToDraft}>Add</md-outlined-button>
                </div>

                <div class="assigned-machines-draft">
                  ${this.draftMachines.length === 0 ? html`
                    <p style="font-size: 0.85rem; color:#888; text-align:center; margin: 8px 0;">No machinery drafted for this station.</p>
                  ` : this.draftMachines.map(machine => html`
                    <div class="draft-badge">
                      <div class="machine-badge-left">
                        <span class="machine-avatar">${machine.number}</span>
                        <span>${machine.name}</span>
                      </div>
                      <md-icon-button @click=${() => this.removeMachineFromDraft(machine.mid)} style="--md-icon-button-state-layer-size:32px;">
                        <md-icon style="font-size:16px;">close</md-icon>
                      </md-icon-button>
                    </div>
                  `)}
                </div>
              </div>
            </div>

            <div class="editor-actions">
              <md-outlined-button @click=${() => this.showEditor = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.saveStation}>Save Station</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-setup-station': ViewSetupStation;
  }
}
