import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, update, set, get } from 'firebase/database';
import { updateProfile, updateEmail, updatePassword, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';

// Material Design 3 Imports
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/switch/switch.js';

@customElement('view-settings')
export class ViewSettings extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: 'Roboto', sans-serif;
    }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }
    .settings-card {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card-title {
      font-size: 1.2rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 12px;
    }
    md-outlined-text-field {
      width: 100%;
    }
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-size: 0.95rem;
    }
    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .toggle-sub {
      font-size: 0.8rem;
      color: #777;
    }
    .btn-block {
      width: 100%;
    }
    .status-alert {
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 0.95rem;
      text-align: center;
      margin-top: 12px;
    }
    .alert-success {
      background-color: #eafaf1;
      color: #2e7d32;
      border: 1px solid #c3e6cb;
    }
    .alert-error {
      background-color: #fde8e8;
      color: #e53935;
      border: 1px solid #f8b4b4;
    }
    
    /* Overlay for keychain manager dialog */
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
      max-width: 440px;
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
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private showKeychainDialog = false;

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
    if (e.key === 'Escape' && this.showKeychainDialog) {
      this.showKeychainDialog = false;
    }
  }

  @state() private newKeychainKey = '';

  // Input states for form targets
  @state() private editDisplayName = '';
  @state() private editEmail = '';
  @state() private editCurrentPassword = '';
  @state() private editNewPassword = '';
  @state() private editCompany = '';
  @state() private editPhone = '';

  // Alerts
  @state() private successMsg = '';
  @state() private errorMsg = '';

  // Controllers to fetch app customization details
  private appDataController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/appData` : null
  );

  override updated() {
    // Sync initial state values on load
    const user = this.authState.user;
    const profile = this.authState.profile;

    if (user && !this.editEmail) {
      this.editDisplayName = user.displayName || '';
      this.editEmail = user.email || '';
    }
    if (profile && !this.editCompany) {
      this.editCompany = profile.company || '';
      this.editPhone = profile.phone || '';
    }
  }

  private triggerSuccess(msg: string) {
    this.errorMsg = '';
    this.successMsg = msg;
    setTimeout(() => this.successMsg = '', 5000);
  }

  private triggerError(msg: string) {
    this.successMsg = '';
    this.errorMsg = msg;
    setTimeout(() => this.errorMsg = '', 6000);
  }

  private async toggleMaterialCount(e: any) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;
    const isChecked = e.target.checked;

    try {
      await set(dbRef(db, `/data/${companyKey}/appData/material_count`), isChecked);
      this.triggerSuccess(`Raw materials calculation successfully ${isChecked ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async toggleWebNotifications(e: any) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;
    const isChecked = e.target.checked;

    try {
      await set(dbRef(db, `/data/${companyKey}/appData/notification`), isChecked);
      this.triggerSuccess(`Web push alerts ${isChecked ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async toggleEmailAlerts(e: any) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;
    const isChecked = e.target.checked;

    try {
      await set(dbRef(db, `/data/${companyKey}/appData/email_alert`), isChecked);
      this.triggerSuccess(`Critical email alerts ${isChecked ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async resetOrderCount() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('WARNING: Are you sure you want to reset the factory order sequence tracker index count back to 1?')) {
      try {
        await set(dbRef(db, `/data/${companyKey}/factoryData/order/order_count`), 1);
        this.triggerSuccess('Sequence tracker index reset to 1.');
      } catch (err: any) {
        this.triggerError(err.message);
      }
    }
  }

  private async saveAccountSettings() {
    const user = this.authState.user;
    if (!user) return;

    try {
      if (this.editDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: this.editDisplayName });
        const userProfileRef = dbRef(db, `/user/${user.uid}`);
        await update(userProfileRef, { displayname: this.editDisplayName });
      }
      this.triggerSuccess('User profile name successfully updated.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async saveOrganizationSettings() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    if (!user || !profile) return;

    try {
      const userProfileRef = dbRef(db, `/user/${user.uid}`);
      await update(userProfileRef, {
        company: this.editCompany,
        phone: this.editPhone
      });
      this.triggerSuccess('Organization details synced successfully.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async changeAuthenticationDetails() {
    const user = this.authState.user;
    if (!user) return;

    if (!this.editCurrentPassword) {
      this.triggerError('Current password is required to verify changes.');
      return;
    }

    try {
      // Re-authenticate user before mutating security configurations
      const credential = EmailAuthProvider.credential(user.email || '', this.editCurrentPassword);
      await reauthenticateWithCredential(user, credential);

      // 1. Check if Email changing
      if (this.editEmail !== user.email) {
        await updateEmail(user, this.editEmail);
        const userProfileRef = dbRef(db, `/user/${user.uid}`);
        await update(userProfileRef, { email: this.editEmail });
      }

      // 2. Check if Password changing
      if (this.editNewPassword) {
        await updatePassword(user, this.editNewPassword);
      }

      this.editCurrentPassword = '';
      this.editNewPassword = '';
      this.triggerSuccess('Authentication records updated successfully.');
    } catch (err: any) {
      this.triggerError(err.message || 'Verification failed. Incorrect password.');
    }
  }

  private async sendVerification() {
    const user = this.authState.user;
    if (!user) return;

    try {
      await sendEmailVerification(user);
      this.triggerSuccess('Verification email dispatched. Please follow the link in your inbox.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async exportFactoryBackup() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    try {
      const companySnapshot = await get(dbRef(db, `/data/${companyKey}`));
      const data = companySnapshot.val();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `imes-backup-${companyKey}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private triggerImportFileClick() {
    this.shadowRoot?.getElementById('importFileInput')?.click();
  }

  private async handleImportBackup(e: any) {
    const file = e.target.files[0];
    const companyKey = this.authState.profile?.key;
    if (!file || !companyKey) return;

    if (!confirm('WARNING: Importing a backup file will completely overwrite all products, stations, orders, and schedules in your active company database. Do you wish to proceed?')) {
      return;
    }

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      // Seed directly into the company data reference
      await set(dbRef(db, `/data/${companyKey}`), backupData);
      
      this.triggerSuccess('Database restored successfully from backup.');
      // Refresh page to fully reload query controllers
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      this.triggerError(`Failed to restore data: ${err.message}`);
    }
  }

  private openKeychainEditor() {
    this.newKeychainKey = this.authState.profile?.key || '';
    this.showKeychainDialog = true;
  }

  private async updateKeychain() {
    const user = this.authState.user;
    if (!user || !this.newKeychainKey) return;

    try {
      // Validate that the targeted keychain has actual factory database structures
      const testSnapshot = await get(dbRef(db, `/data/${this.newKeychainKey}/factoryData`));
      if (!testSnapshot.exists()) {
        alert('Keychain Error: Target keychain references an empty or invalid company profile.');
        return;
      }

      const userProfileRef = dbRef(db, `/user/${user.uid}`);
      await update(userProfileRef, { key: this.newKeychainKey });
      
      this.showKeychainDialog = false;
      this.triggerSuccess('Keychain switched successfully. Reloading view workspace...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  override render() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    const appData = this.appDataController.data;

    return html`
      <div style="display:flex; flex-direction:column; gap:16px; margin-bottom: 24px;">
        ${this.successMsg ? html`<div class="status-alert alert-success">${this.successMsg}</div>` : ''}
        ${this.errorMsg ? html`<div class="status-alert alert-error">${this.errorMsg}</div>` : ''}
      </div>

      <div class="settings-grid">
        <!-- 1. General Customizations -->
        <div class="settings-card">
          <h3 class="card-title">General Settings</h3>
          
          <div class="toggle-row">
            <div class="toggle-label">
              <span>Raw Materials Calculation</span>
              <span class="toggle-sub">Account for weight requirements during order booking</span>
            </div>
            <md-switch 
              .selected=${!!appData?.material_count} 
              @change=${this.toggleMaterialCount}>
            </md-switch>
          </div>

          <md-outlined-button class="btn-block" @click=${this.resetOrderCount}>Reset Order Sequence Tracker</md-outlined-button>
        </div>

        <!-- 2. Account Preferences -->
        <div class="settings-card">
          <h3 class="card-title">Account Preferences</h3>
          <md-outlined-text-field 
            label="Display Name" 
            .value=${this.editDisplayName}
            @input=${(e: any) => this.editDisplayName = e.target.value}>
          </md-outlined-text-field>

          <md-filled-button class="btn-block" @click=${this.saveAccountSettings}>Save Account Details</md-filled-button>
        </div>

        <!-- 3. Security & Credentials -->
        <div class="settings-card">
          <h3 class="card-title">Security & Authentication</h3>
          <md-outlined-text-field 
            label="Email Address" 
            type="email"
            .value=${this.editEmail}
            @input=${(e: any) => this.editEmail = e.target.value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="New Password" 
            type="password"
            helperText="Leave blank to preserve current password"
            .value=${this.editNewPassword}
            @input=${(e: any) => this.editNewPassword = e.target.value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="Current Password" 
            type="password"
            helperText="Enter password to authorize profile modifications"
            .value=${this.editCurrentPassword}
            @input=${(e: any) => this.editCurrentPassword = e.target.value}>
          </md-outlined-text-field>

          <md-filled-button class="btn-block" @click=${this.changeAuthenticationDetails}>Authorize Changes</md-filled-button>

          ${user && !user.emailVerified ? html`
            <md-outlined-button class="btn-block" @click=${this.sendVerification}>Verify Email Account</md-outlined-button>
          ` : ''}
        </div>

        <!-- 4. Backup Console -->
        <div class="settings-card">
          <h3 class="card-title">Backup & Restore</h3>
          <p style="font-size:0.9rem; color:#555; margin:0; line-height:1.4;">Safeguard your manufacturing data by exporting/importing active JSON schemas.</p>
          
          <md-outlined-button class="btn-block" @click=${this.exportFactoryBackup}>Export Data Backup</md-outlined-button>
          
          <md-outlined-button class="btn-block" @click=${this.triggerImportFileClick}>Import Data Recovery</md-outlined-button>
          <input 
            type="file" 
            id="importFileInput" 
            accept=".json" 
            style="display:none;" 
            @change=${this.handleImportBackup}/>
        </div>

        <!-- 5. Notification Routing -->
        <div class="settings-card">
          <h3 class="card-title">Notification Channels</h3>
          
          <div class="toggle-row">
            <div class="toggle-label">
              <span>Web Push Alerts</span>
              <span class="toggle-sub">Toggle critical system popup alerts in the browser</span>
            </div>
            <md-switch 
              .selected=${!!appData?.notification} 
              @change=${this.toggleWebNotifications}>
            </md-switch>
          </div>

          <div class="toggle-row">
            <div class="toggle-label">
              <span>Email Alerts</span>
              <span class="toggle-sub">Toggle critical notifications dispatched to your inbox</span>
            </div>
            <md-switch 
              .selected=${!!appData?.email_alert} 
              @change=${this.toggleEmailAlerts}>
            </md-switch>
          </div>
        </div>

        <!-- 6. Organization Layout -->
        <div class="settings-card">
          <h3 class="card-title">Organization Settings</h3>
          <md-outlined-text-field 
            label="Company Name" 
            .value=${this.editCompany}
            @input=${(e: any) => this.editCompany = e.target.value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="Phone Number" 
            type="tel"
            .value=${this.editPhone}
            @input=${(e: any) => this.editPhone = e.target.value}>
          </md-outlined-text-field>

          <div style="font-size:0.85rem; color:#555; line-height:1.5;">
            <div><strong>Active Keychain ID:</strong> ${profile?.key || 'N/A'}</div>
            <div><strong>User Role:</strong> ${profile?.role || 'operator'}</div>
          </div>

          <md-outlined-button class="btn-block" @click=${this.openKeychainEditor}>Manage Keychain</md-outlined-button>
          <md-filled-button class="btn-block" @click=${this.saveOrganizationSettings}>Save Organization</md-filled-button>
        </div>
      </div>

      <!-- Keychain Editor Overlay -->
      ${this.showKeychainDialog ? html`
        <div class="overlay">
          <div class="dialog">
            <h4>Manage Database Keychain</h4>
            <p style="font-size:0.85rem; color:#e53935; line-height:1.4; margin:0;">
              ⚠️ WARNING: Modifying your data keychain will point your user session to a different factory silo. Ensure you have backed up your current data.
            </p>

            <md-outlined-text-field 
              label="Data Keychain ID Key" 
              .value=${this.newKeychainKey}
              @input=${(e: any) => this.newKeychainKey = e.target.value}
              required>
            </md-outlined-text-field>

            <div class="dialog-actions">
              <md-outlined-button @click=${() => this.showKeychainDialog = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.updateKeychain}>Switch Keychain</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-settings': ViewSettings;
  }
}
