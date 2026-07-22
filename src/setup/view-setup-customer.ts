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

interface CustomerItem {
  $key: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  created?: number;
}

@customElement('view-setup-customer')
export class ViewSetupCustomer extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .customer-workspace {
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

    /* Grid Layout */
    .customer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .customer-card {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .customer-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border-color: rgba(0,0,0,0.15);
    }
    .customer-header {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .avatar-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: #f0f0f0;
      color: #3f51b5;
      font-weight: 600;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(63, 81, 181, 0.1);
    }
    .customer-meta {
      flex: 1;
    }
    .customer-name {
      font-weight: 500;
      font-size: 1.1rem;
      margin: 0;
      color: #202020;
    }
    .customer-role {
      font-size: 0.8rem;
      color: #666;
      margin-top: 1px;
    }

    /* Details Section */
    .customer-info-sec {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.85rem;
      border-top: 1px dashed rgba(0,0,0,0.08);
      padding-top: 12px;
    }
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #444;
    }
    .info-row md-icon {
      font-size: 16px;
      color: #666;
      --md-icon-size: 16px;
    }
    .info-address {
      font-size: 0.8rem;
      color: #666;
      line-height: 1.4;
      margin: 4px 0 0 24px;
      background-color: #f9f9f9;
      padding: 6px 10px;
      border-radius: 6px;
    }

    .customer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      border-top: 1px solid rgba(0,0,0,0.04);
      padding-top: 8px;
      margin-top: 4px;
    }

    /* Dialog Editor Styling */
    .editor-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .editor-dialog {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 480px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .editor-dialog h4 {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-row {
      display: flex;
      gap: 12px;
    }
    .form-row md-outlined-text-field {
      flex: 1;
    }
    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 16px;
    }
    md-outlined-text-field {
      width: 100%;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private showEditor = false;
  @state() private editingKey: string | null = null; // null = Add, string = Edit

  // Form Fields
  @state() private editFname = '';
  @state() private editLname = '';
  @state() private editEmail = '';
  @state() private editMobile = '';
  @state() private editAddress = '';

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

  // Real-time Queries
  private customerController = new FirebaseQueryController<CustomerItem>(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/factoryData/customer` : null
  );

  private openAddDialog() {
    this.editingKey = null;
    this.editFname = '';
    this.editLname = '';
    this.editEmail = '';
    this.editMobile = '';
    this.editAddress = '';
    this.showEditor = true;
  }

  private openEditDialog(cust: CustomerItem) {
    this.editingKey = cust.$key;
    
    // Split name to first and last if possible, fallback gracefully
    const nameParts = (cust.name || '').trim().split(/\s+/);
    this.editFname = nameParts[0] || '';
    this.editLname = nameParts.slice(1).join(' ') || '';

    this.editEmail = cust.email || '';
    
    // Remove hyphens for editing, we format on save
    this.editMobile = (cust.mobile || '').replace(/-/g, '');
    this.editAddress = cust.address || '';
    this.showEditor = true;
  }

  private async deleteCustomer(key: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to delete this customer? All historical tracking links will remain but the profile will be removed.')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/factoryData/customer/${key}`));
      } catch (err) {
        console.error('Failed to remove customer', err);
      }
    }
  }

  private async saveCustomer() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (!this.editFname.trim() || !this.editLname.trim()) {
      alert('First Name and Last Name are required.');
      return;
    }

    if (!this.editEmail.trim() || !this.editEmail.includes('@')) {
      alert('A valid email address is required.');
      return;
    }

    // Format mobile hyphens (e.g. 0841234567 -> 084-123-4567)
    let formattedMobile = this.editMobile.replace(/\D/g, ''); // only digits
    if (formattedMobile.length === 10) {
      formattedMobile = formattedMobile.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    } else if (formattedMobile.length === 9) {
      formattedMobile = formattedMobile.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    } else {
      formattedMobile = this.editMobile; // use whatever they typed
    }

    const payload = {
      name: `${this.editFname.trim()} ${this.editLname.trim()}`,
      email: this.editEmail.trim(),
      mobile: formattedMobile.trim(),
      address: this.editAddress.trim()
    };

    try {
      if (this.editingKey) {
        // Edit Mode
        await update(dbRef(db, `/data/${companyKey}/factoryData/customer/${this.editingKey}`), payload);
      } else {
        // Add Mode
        const newRef = push(dbRef(db, `/data/${companyKey}/factoryData/customer`));
        await set(newRef, {
          ...payload,
          created: Math.round(Date.now() / 1000)
        });
      }
      this.showEditor = false;
    } catch (err) {
      console.error('Failed to save customer', err);
    }
  }

  private getInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + last).toUpperCase();
  }

  override render() {
    if (this.customerController.loading) {
      return html`<p>Loading Customer Records...</p>`;
    }

    const customers = this.customerController.data;

    return html`
      <div class="customer-workspace">
        <div class="header-bar">
          <h3>Customer Registry</h3>
          <md-filled-button @click=${this.openAddDialog}>
            <md-icon slot="icon">add</md-icon>
            Add Customer
          </md-filled-button>
        </div>

        ${customers.length === 0 ? html`
          <p>No customers configured inside this platform. Register your accounts here to link production orders.</p>
        ` : html`
          <div class="customer-grid">
            ${customers.map(cust => html`
              <div class="customer-card">
                <div class="customer-header">
                  <div class="avatar-circle">
                    ${this.getInitials(cust.name)}
                  </div>
                  <div class="customer-meta">
                    <h4 class="customer-name">${cust.name}</h4>
                    <p class="customer-role">Client Account</p>
                  </div>
                </div>

                <div class="customer-info-sec">
                  <div class="info-row">
                    <md-icon>mail</md-icon>
                    <span>${cust.email}</span>
                  </div>
                  <div class="info-row">
                    <md-icon>phone</md-icon>
                    <span>${cust.mobile || 'No contact number'}</span>
                  </div>
                  ${cust.address ? html`
                    <div class="info-row" style="margin-top: 4px;">
                      <md-icon>location_on</md-icon>
                      <span style="font-weight: 500;">Delivery / Shipping Address</span>
                    </div>
                    <p class="info-address">${cust.address}</p>
                  ` : ''}
                </div>

                <div class="customer-actions">
                  <md-icon-button @click=${() => this.openEditDialog(cust)}>
                    <md-icon>edit</md-icon>
                  </md-icon-button>
                  <md-icon-button @click=${() => this.deleteCustomer(cust.$key)}>
                    <md-icon>delete</md-icon>
                  </md-icon-button>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>

      <!-- Overlay Dialog -->
      ${this.showEditor ? html`
        <div class="editor-overlay">
          <div class="editor-dialog">
            <h4>${this.editingKey ? 'Modify Client Account' : 'Register New Client'}</h4>

            <div class="form-group">
              <div class="form-row">
                <md-outlined-text-field 
                  label="First Name" 
                  .value=${this.editFname}
                  @input=${(e: any) => this.editFname = e.target.value}
                  required>
                </md-outlined-text-field>
                <md-outlined-text-field 
                  label="Last Name" 
                  .value=${this.editLname}
                  @input=${(e: any) => this.editLname = e.target.value}
                  required>
                </md-outlined-text-field>
              </div>

              <md-outlined-text-field 
                label="Email Address" 
                type="email"
                .value=${this.editEmail}
                @input=${(e: any) => this.editEmail = e.target.value}
                required>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Mobile Phone" 
                type="tel"
                .value=${this.editMobile}
                @input=${(e: any) => this.editMobile = e.target.value}>
              </md-outlined-text-field>

              <md-outlined-text-field 
                label="Corporate or Shipping Address" 
                .value=${this.editAddress}
                @input=${(e: any) => this.editAddress = e.target.value}>
              </md-outlined-text-field>
            </div>

            <div class="editor-actions">
              <md-outlined-button @click=${() => this.showEditor = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.saveCustomer}>Save Client</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-setup-customer': ViewSetupCustomer;
  }
}
