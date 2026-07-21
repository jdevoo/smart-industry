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

interface MachineItem {
  $key: string;
  description: string;
  name: string;
  number: number;
  capacity: string;
  state: boolean;
}

@customElement('view-setup-machine')
export class ViewSetupMachine extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .machine-workspace {
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
    
    /* Machine cards layout */
    .machine-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .machine-card {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
    }
    .machine-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .machine-title {
      font-weight: 500;
      font-size: 1.1rem;
      margin: 0;
      color: #202020;
    }
    .machine-meta {
      font-size: 0.8rem;
      color: #666;
      margin-top: 2px;
    }
    .machine-description {
      font-size: 0.9rem;
      color: #444;
      line-height: 1.4;
      min-height: 40px;
    }
    .machine-specs {
      display: flex;
      gap: 16px;
      font-size: 0.85rem;
      background-color: #f5f5f5;
      padding: 8px 12px;
      border-radius: 6px;
    }
    .machine-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
    }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-active { background-color: #2e7d32; }
    .status-inactive { background-color: #e53935; }

    .machine-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    /* Modal Form Styling */
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
      max-width: 440px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .editor-dialog h4 {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0 0 4px 0;
    }
    .editor-form-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }
    md-outlined-text-field {
      width: 100%;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private showEditor = false;
  @state() private editingKey: string | null = null; // null = Add mode, string = Edit mode

  // Editor fields
  @state() private editName = '';
  @state() private editNumber = 1;
  @state() private editCapacity = '100';
  @state() private editDescription = '';
  @state() private editState = true;

  // Real-time machines list controller
  private machinesController = new FirebaseQueryController<MachineItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/machine` : null
  );

  private openAddDialog() {
    this.editingKey = null;
    this.editName = '';
    // Suggest next numerical identifier based on current machines length
    const currentMax = this.machinesController.data.reduce((max, item) => item.number > max ? item.number : max, 0);
    this.editNumber = currentMax + 1;
    this.editCapacity = '100';
    this.editDescription = '';
    this.editState = true;
    this.showEditor = true;
  }

  private openEditDialog(machine: MachineItem) {
    this.editingKey = machine.$key;
    this.editName = machine.name || '';
    this.editNumber = machine.number || 1;
    this.editCapacity = (machine.capacity !== undefined ? machine.capacity : '100').toString();
    this.editDescription = machine.description || '';
    this.editState = machine.state !== undefined ? machine.state : true;
    this.showEditor = true;
  }

  private async deleteMachine(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to remove this machine configuration?')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/factoryData/machine/${key}`));
      } catch (err) {
        console.error('Failed to remove machine', err);
      }
    }
  }

  private async saveMachine() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (!this.editName) {
      alert('Machine Name is a required field');
      return;
    }

    const payload = {
      name: this.editName,
      number: Number(this.editNumber),
      capacity: this.editCapacity,
      description: this.editDescription,
      state: this.editState
    };

    try {
      if (this.editingKey) {
        // Edit mode
        await update(dbRef(db, `/data/${companyKey}/factoryData/machine/${this.editingKey}`), payload);
      } else {
        // Add mode
        const newMachineRef = push(dbRef(db, `/data/${companyKey}/factoryData/machine`));
        await set(newMachineRef, payload);
      }
      this.showEditor = false;
    } catch (err) {
      console.error('Error saving machine details', err);
    }
  }

  override render() {
    if (this.machinesController.loading) {
      return html`<p>Loading Machine Registry...</p>`;
    }

    const machines = this.machinesController.data;

    return html`
      <div class="machine-workspace">
        <div class="header-bar">
          <h3>Registered Factory Machines</h3>
          <md-filled-button @click=${this.openAddDialog}>
            <md-icon slot="icon">add</md-icon>
            Add Machine
          </md-filled-button>
        </div>

        ${machines.length === 0 ? html`
          <p>No machinery registered in this factory layout yet. Click 'Add Machine' to register your first.</p>
        ` : html`
          <div class="machine-grid">
            ${machines.map(machine => html`
              <div class="machine-card">
                <div class="machine-header">
                  <div>
                    <h4 class="machine-title">${machine.name}</h4>
                    <p class="machine-meta">Asset Number: #${machine.number}</p>
                  </div>
                  <div class="machine-status">
                    <span class="status-indicator ${machine.state ? 'status-active' : 'status-inactive'}"></span>
                    <span>${machine.state ? 'Active' : 'Offline'}</span>
                  </div>
                </div>

                <p class="machine-description">${machine.description || 'No asset description provided.'}</p>

                <div class="machine-specs">
                  <div><strong>Max Capacity:</strong> ${machine.capacity || 'N/A'} items/hr</div>
                </div>

                <div class="machine-actions">
                  <md-icon-button @click=${() => this.openEditDialog(machine)}>
                    <md-icon>edit</md-icon>
                  </md-icon-button>
                  <md-icon-button @click=${() => this.deleteMachine(machine.$key)}>
                    <md-icon>delete</md-icon>
                  </md-icon-button>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>

      <!-- Machine Dialog Overlay Editor -->
      ${this.showEditor ? html`
        <div class="editor-overlay">
          <div class="editor-dialog">
            <h4>${this.editingKey ? 'Edit Machine Details' : 'Register New Machine'}</h4>
            
            <div class="editor-form-group">
              <md-outlined-text-field 
                label="Machine Name" 
                .value=${this.editName}
                @input=${(e: any) => this.editName = e.target.value}
                required>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Machine Number" 
                type="number" 
                .value=${this.editNumber.toString()}
                @input=${(e: any) => this.editNumber = Number(e.target.value)}>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Max Capacity (items/hour)" 
                type="number" 
                .value=${this.editCapacity}
                @input=${(e: any) => this.editCapacity = e.target.value}>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Asset Description" 
                .value=${this.editDescription}
                @input=${(e: any) => this.editDescription = e.target.value}>
              </md-outlined-text-field>

              <div class="checkbox-container" style="display:flex; align-items:center; gap:8px;">
                <input 
                  type="checkbox" 
                  id="machineStatusChk" 
                  .checked=${this.editState}
                  @change=${(e: any) => this.editState = e.target.checked}/>
                <label for="machineStatusChk">Machine Operational (Active State)</label>
              </div>
            </div>

            <div class="editor-actions">
              <md-outlined-button @click=${() => this.showEditor = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.saveMachine}>Save Machine</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-setup-machine': ViewSetupMachine;
  }
}
