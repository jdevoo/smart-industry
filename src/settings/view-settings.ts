import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, update, set, get, remove } from 'firebase/database';
import { updateProfile, updateEmail, updatePassword, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';

// Material Design 3 Imports
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/switch/switch.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

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
    
    /* Profile Avatar section */
    .profile-avatar-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.1);
      background-color: #f0f0f0;
      object-fit: cover;
    }
    .avatar-btn-group {
      display: flex;
      gap: 8px;
    }

    /* Dialog overlays */
    .overlay {
      position: fixed;
      top: 0; right: 0; bottom: 0; left: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
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
      max-width: 480px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dialog h4 {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 8px;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.05);
      padding-top: 16px;
    }

    /* Manage Users List */
    .users-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .user-list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.05);
      background-color: #fafafa;
    }
    .user-item-details {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-item-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      background-color: #eee;
    }
    .user-item-info {
      display: flex;
      flex-direction: column;
    }
    .user-item-name {
      font-size: 0.88rem;
      font-weight: 500;
      color: #202020;
    }
    .user-item-email {
      font-size: 0.75rem;
      color: #777;
    }
    .user-item-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;

  @consume({ context: userContext, subscribe: true })
  @state()
  private authState!: UserContextValue;

  @state() private showKeychainDialog = false;
  @state() private showManageUsersDialog = false;

  // WebUSB Devices lists
  @state() private foundDevices: string[] = [];
  @state() private activeDevices: string[] = [];

  // Manage Users dataset
  @state() private companyUsers: Array<{ uid: string; displayname: string; email: string; role: string; photoURL: string | null }> = [];

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
    if (e.key === 'Escape') {
      if (this.showKeychainDialog) {
        this.showKeychainDialog = false;
      }
      if (this.showManageUsersDialog) {
        this.showManageUsersDialog = false;
      }
    }
  }

  @state() private newKeychainKey = '';

  // Form Fields
  @state() private editDisplayName = '';
  @state() private editEmail = '';
  @state() private editCurrentPassword = '';
  @state() private editNewPassword = '';
  @state() private editCompany = '';

  // App Data customisations
  private appDataController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? `/data/${this.authState.profile.key}/appData` : null
  );

  override updated() {
    const user = this.authState.user;
    const profile = this.authState.profile;

    if (user && !this.editEmail) {
      this.editDisplayName = user.displayName || '';
      this.editEmail = user.email || '';
    }
    if (profile && !this.editCompany) {
      this.editCompany = profile.company || '';
    }
  }

  private triggerSuccess(msg: string) {
    alert(msg);
  }

  private triggerError(msg: string) {
    alert(msg);
  }

  // --- 1. General Settings (Sensors and Language) ---

  private async scanDevice() {
    if ('usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x2341 }, // Arduino
            { vendorId: 0x2a03 }  // Arduino LLC
          ]
        });
        const name = device.productName || `USB Device (${device.vendorId.toString(16)})`;
        this.foundDevices = [...this.foundDevices, name];
        this.triggerSuccess(`Found physical sensor: ${name}`);
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          this.triggerError(err.message);
        }
      }
    } else {
      alert('Your web browser does not support physical device detection. Please use Google Chrome');
    }
  }

  private async showDevice() {
    if ('usb' in navigator) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        if (devices.length === 0) {
          alert('No active physical sensors currently connected to this terminal.');
        } else {
          this.activeDevices = devices.map((d: any) => d.productName || `Device Vendor ${d.vendorId}`);
          alert(`Connected Sensors Directory:\n\n${this.activeDevices.map(name => `• ${name}`).join('\n')}`);
        }
      } catch (err: any) {
        this.triggerError(err.message);
      }
    } else {
      alert('Your web browser does not support physical device detection. Please use Google Chrome');
    }
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

  // --- 2. Account Preferences (Profile Details, Images & Erasures) ---

  private triggerProfileImageUpload() {
    const fileInput = this.shadowRoot?.getElementById('profileImageInput') as HTMLInputElement;
    fileInput?.click();
  }

  private async handleProfileImageChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    const user = this.authState.user;
    if (!file || !user) return;

    if (!file.type.match(/image.*/)) {
      this.triggerError('Invalid file format. Please upload an image.');
      return;
    }

    if (file.size > 1024 * 1024) { // 1MB limit
      this.triggerError('File size exceeds the 1MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      try {
        await updateProfile(user, { photoURL: base64Url });
        const userProfileRef = dbRef(db, `/user/${user.uid}`);
        await update(userProfileRef, { photoURL: base64Url });
        this.triggerSuccess('Profile image updated successfully.');
      } catch (err: any) {
        this.triggerError(err.message);
      }
    };
    reader.readAsDataURL(file);
  }

  private async removeProfileImage() {
    const user = this.authState.user;
    if (!user) return;

    if (confirm('Are you sure you want to remove your profile image?')) {
      try {
        await updateProfile(user, { photoURL: '' });
        const userProfileRef = dbRef(db, `/user/${user.uid}`);
        await update(userProfileRef, { photoURL: null });
        this.triggerSuccess('Profile image removed successfully.');
      } catch (err: any) {
        this.triggerError(err.message);
      }
    }
  }

  private async deleteAccount() {
    const user = this.authState.user;
    const companyKey = this.authState.profile?.key;
    if (!user || !companyKey) return;

    if (confirm('DANGER: Delete this account? Your factory workspace and personal profiles will be permanently erased. This is irreversible.')) {
      const password = prompt("To confirm account deletion, please enter your current password:");
      if (!password) {
        alert('Password verification canceled. Account deletion aborted.');
        return;
      }

      try {
        const credential = EmailAuthProvider.credential(user.email || '', password);
        await reauthenticateWithCredential(user, credential);

        // Wipe Database references
        await remove(dbRef(db, `/data/${companyKey}`));
        await remove(dbRef(db, `/user/${user.uid}`));

        // Delete Auth User
        await deleteUser(user);

        alert('Account and company silo successfully deleted.');
        window.location.reload();
      } catch (err: any) {
        alert(`Account deletion failed: ${err.message}`);
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

  // --- 3. Authentication Settings (Emails & Password Mutators) ---

  private async changeEmail() {
    const user = this.authState.user;
    if (!user) return;

    if (!this.editCurrentPassword) {
      this.triggerError('Current password is required to verify email modification.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email || '', this.editCurrentPassword);
      await reauthenticateWithCredential(user, credential);

      await updateEmail(user, this.editEmail);
      const userProfileRef = dbRef(db, `/user/${user.uid}`);
      await update(userProfileRef, { email: this.editEmail });

      this.editCurrentPassword = '';
      this.triggerSuccess('Email address updated successfully.');
    } catch (err: any) {
      this.triggerError(err.message || 'Incorrect password.');
    }
  }

  private async changePassword() {
    const user = this.authState.user;
    if (!user) return;

    if (!this.editNewPassword) {
      this.triggerError('Please enter a new password.');
      return;
    }

    if (!this.editCurrentPassword) {
      this.triggerError('Current password is required to authorize password changes.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email || '', this.editCurrentPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, this.editNewPassword);

      this.editCurrentPassword = '';
      this.editNewPassword = '';
      this.triggerSuccess('Account password changed successfully.');
    } catch (err: any) {
      this.triggerError(err.message || 'Incorrect password.');
    }
  }

  private async sendVerification() {
    const user = this.authState.user;
    if (!user) return;

    try {
      await sendEmailVerification(user);
      this.triggerSuccess('Verification email dispatched. Please check your inbox.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  // --- 4. Backup Console ---

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

    if (!confirm('WARNING: Overwrite active factory database? All orders, tracking steps, and materials will be replaced.')) {
      return;
    }

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      await set(dbRef(db, `/data/${companyKey}`), backupData);
      
      this.triggerSuccess('Database restored successfully from backup.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      this.triggerError(`Failed to restore data: ${err.message}`);
    }
  }

  // --- 5. Notifications Customizations ---

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

  // --- 6. Organization Layout & Team Members ---

  private async openManageUsers() {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    try {
      const snapshot = await get(dbRef(db, `/data/${companyKey}/users`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        this.companyUsers = Object.keys(data).map(uid => ({
          uid,
          ...data[uid]
        }));
      } else {
        this.companyUsers = [];
      }
      this.showManageUsersDialog = true;
    } catch (err: any) {
      this.triggerError(`Failed to load company members: ${err.message}`);
    }
  }

  private async changeUserRole(uid: string, newRole: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    try {
      await update(dbRef(db, `/data/${companyKey}/users/${uid}`), { role: newRole });
      this.companyUsers = this.companyUsers.map(u => u.uid === uid ? { ...u, role: newRole } : u);
      this.triggerSuccess('User member role modified successfully.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async removeUserFromCompany(uid: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to remove this user from your company? They will lose access to all factory data.')) {
      try {
        await remove(dbRef(db, `/data/${companyKey}/users/${uid}`));
        this.companyUsers = this.companyUsers.filter(u => u.uid !== uid);
        this.triggerSuccess('User successfully unlinked from company silo.');
      } catch (err: any) {
        this.triggerError(err.message);
      }
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

  private async saveOrganizationSettings() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    if (!user || !profile) return;

    try {
      const userProfileRef = dbRef(db, `/user/${user.uid}`);
      await update(userProfileRef, {
        company: this.editCompany
      });
      this.triggerSuccess('Organization details synced successfully.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  override render() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    const appData = this.appDataController.data;
    const avatarUrl = user?.photoURL || '/images/profile/icon-512x512.png';

    return html`
      <div class="settings-grid">
        <!-- 1. General Settings -->
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

          <div style="display:flex; gap:8px; margin-top:4px;">
            <md-outlined-button style="flex:1;" @click=${this.scanDevice}>Search Sensor</md-outlined-button>
            <md-outlined-button style="flex:1;" @click=${this.showDevice}>Show Sensor</md-outlined-button>
          </div>

          <md-outlined-button class="btn-block" @click=${this.resetOrderCount}>Reset Order Sequence Tracker</md-outlined-button>
        </div>

        <!-- 2. Account Preferences -->
        <div class="settings-card">
          <h3 class="card-title">Account Preferences</h3>
          
          <div class="profile-avatar-row">
            <img 
              class="profile-avatar" 
              src="${avatarUrl}" 
              alt="User Avatar"
              @error=${(e: any) => {
                if (e.target.src.includes('icon-512x512.png')) {
                  e.target.src = '/images/profile/any.svg';
                }
              }} />
            <div class="avatar-btn-group">
              <md-outlined-button @click=${this.triggerProfileImageUpload}>Change Image</md-outlined-button>
              <md-outlined-button @click=${this.removeProfileImage} ?disabled=${!user?.photoURL}>Remove</md-outlined-button>
            </div>
            <input 
              type="file" 
              id="profileImageInput" 
              accept="image/*" 
              style="display:none;" 
              @change=${this.handleProfileImageChange} />
          </div>

          <md-outlined-text-field 
            label="Display Name" 
            .value=${this.editDisplayName}
            @input=${(e: any) => this.editDisplayName = e.target.value}>
          </md-outlined-text-field>

          <md-filled-button class="btn-block" @click=${this.saveAccountSettings}>Save Account Details</md-filled-button>
          
          <md-outlined-button class="btn-block" @click=${this.deleteAccount} style="--md-outlined-button-label-text-color: #c62828; --md-outlined-button-outline-color: #fde8e8;">
            <md-icon slot="icon">delete_forever</md-icon> Delete Account
          </md-outlined-button>
        </div>

        <!-- 3. Authentication Settings -->
        <div class="settings-card">
          <h3 class="card-title">Authentication Settings</h3>
          <md-outlined-text-field 
            label="Email Address" 
            type="email"
            .value=${this.editEmail}
            @input=${(e: any) => this.editEmail = e.target.value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="New Password" 
            type="password"
            helperText="Provide password value to change"
            .value=${this.editNewPassword}
            @input=${(e: any) => this.editNewPassword = e.target.value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="Current Password" 
            type="password"
            helperText="Enter current password to re-authenticate changes"
            .value=${this.editCurrentPassword}
            @input=${(e: any) => this.editCurrentPassword = e.target.value}>
          </md-outlined-text-field>

          <div style="display:flex; gap:8px; margin-top:4px;">
            <md-filled-button style="flex:1;" @click=${this.changeEmail}>Change E-mail</md-filled-button>
            <md-filled-button style="flex:1;" @click=${this.changePassword}>Change Password</md-filled-button>
          </div>

          ${user && !user.emailVerified ? html`
            <md-outlined-button class="btn-block" @click=${this.sendVerification}>Verify Account</md-outlined-button>
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

          <div style="font-size:0.85rem; color:#555; line-height:1.5; background:#fafafa; border-radius:6px; border:1px solid rgba(0,0,0,0.04); padding:10px;">
            <div><strong>Active Keychain ID:</strong> ${profile?.key || 'N/A'}</div>
            <div><strong>User Role:</strong> ${profile?.role || 'operator'}</div>
          </div>

          <md-outlined-button class="btn-block" @click=${this.openKeychainEditor}>Manage Keychain</md-outlined-button>
          <md-outlined-button class="btn-block" @click=${this.openManageUsers}>Manage Users</md-outlined-button>
          <md-filled-button class="btn-block" @click=${this.saveOrganizationSettings}>Save Organization Settings</md-filled-button>
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

      <!-- Manage Users Dialog Overlay -->
      ${this.showManageUsersDialog ? html`
        <div class="overlay">
          <div class="dialog" style="max-width:540px;">
            <h4>Manage Company Members</h4>
            <p style="font-size:0.85rem; color:#666; margin:0;">Below are the active registered accounts linked to your factory database keychain:</p>

            <div class="users-list">
              ${this.companyUsers.length === 0 ? html`
                <span style="font-style:italic; color:#888; text-align:center; padding:12px;">No unlinked members found. All users registered under this key automatically sync here.</span>
              ` : this.companyUsers.map(u => html`
                <div class="user-list-item">
                  <div class="user-item-details">
                    <img 
                      class="user-item-avatar" 
                      src="${u.photoURL || '/images/profile/icon-512x512.png'}" 
                      @error=${(e: any) => {
                        if (e.target.src.includes('icon-512x512.png')) {
                          e.target.src = '/images/profile/any.svg';
                        }
                      }} />
                    <div class="user-item-info">
                      <span class="user-item-name">${u.displayname} ${u.uid === user?.uid ? '(You)' : ''}</span>
                      <span class="user-item-email">${u.email}</span>
                    </div>
                  </div>

                  <div class="user-item-actions">
                    <md-outlined-select 
                      style="min-width:110px; --md-outlined-select-text-field-container-height: 32px;"
                      .value=${u.role}
                      ?disabled=${u.uid === user?.uid}
                      @change=${(e: any) => this.changeUserRole(u.uid, e.target.value)}>
                      <md-select-option value="operator"><div slot="headline">Operator</div></md-select-option>
                      <md-select-option value="admin"><div slot="headline">Admin</div></md-select-option>
                    </md-outlined-select>

                    <md-icon-button 
                      ?disabled=${u.uid === user?.uid}
                      @click=${() => this.removeUserFromCompany(u.uid)} 
                      title="Remove Member">
                      <md-icon style="color:#d32f2f;">person_remove</md-icon>
                    </md-icon-button>
                  </div>
                </div>
              `)}
            </div>

            <div class="dialog-actions">
              <md-filled-button @click=${() => this.showManageUsersDialog = false}>Close Panel</md-filled-button>
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