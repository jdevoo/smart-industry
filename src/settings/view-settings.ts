import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { ref as dbRef, update, set, get, remove, push } from 'firebase/database';
import { updateProfile, updateEmail, updatePassword, sendEmailVerification, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { db } from '../config/firebase.js';
import { userContext, UserContextValue } from '../context/userContext.js';
import { companyUsersContext, QueryContextValue, CompanyUserData, factoryProfileContext, DocContextValue, FactoryProfileData } from '../context/dataContexts.js';
import { FirebaseDocController } from '../controllers/FirebaseDocController.js';
import { DbFolder, getCompanyPath, getUserProfilePath, getFactoriesPath } from '../config/db-paths.js';

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
    md-outlined-text-field, md-outlined-select {
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

    /* Keychain Info Box */
    .keychain-box {
      font-size: 0.85rem;
      color: #444;
      line-height: 1.6;
      background: #f7f9fa;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .keychain-key-display {
      font-family: monospace;
      font-size: 0.88rem;
      background: #eef2f5;
      padding: 4px 8px;
      border-radius: 4px;
      word-break: break-all;
      color: #202020;
    }
    .role-badge {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      display: inline-block;
      width: fit-content;
    }
    .role-badge.admin {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }
    .role-badge.operator {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #bbdefb;
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

  @consume({ context: factoryProfileContext, subscribe: true })
  @state()
  private factoryProfileState!: DocContextValue<FactoryProfileData>;

  @consume({ context: companyUsersContext, subscribe: true })
  @state()
  private companyUsersState!: QueryContextValue<CompanyUserData>;

  // Dialog Visibility States
  @state() private showKeychainDialog = false;
  @state() private showManageUsersDialog = false;
  @state() private showNewFactoryDialog = false;

  // WebUSB Devices lists
  @state() private foundDevices: string[] = [];
  @state() private activeDevices: string[] = [];

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
      if (this.showKeychainDialog) this.showKeychainDialog = false;
      if (this.showManageUsersDialog) this.showManageUsersDialog = false;
      if (this.showNewFactoryDialog) this.showNewFactoryDialog = false;
    }
  }

  @state() private newKeychainKey = '';

  // Form Fields
  @state() private editDisplayName = '';
  @state() private editEmail = '';
  @state() private editCurrentPassword = '';
  @state() private editNewPassword = '';
  @state() private editCompany = '';
  @state() private editFactoryName = '';

  // Provision New Factory Fields
  @state() private newFactoryName = '';
  @state() private newFactoryCompany = '';
  @state() private newFactoryModel = 'serial';

  // App Data customisations
  private appDataController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.APP_DATA) : null
  );

  override updated() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    const factoryProfile = this.factoryProfileState?.data;

    if (user && !this.editEmail) {
      this.editDisplayName = user.displayName || '';
      this.editEmail = user.email || '';
    }
    if (profile && !this.editCompany) {
      this.editCompany = profile.company || '';
    }
    if ((factoryProfile?.name || profile?.factoryName) && !this.editFactoryName) {
      this.editFactoryName = factoryProfile?.name || profile?.factoryName || '';
    }
  }

  private triggerSuccess(msg: string) {
    alert(msg);
  }

  private triggerError(msg: string) {
    alert(msg);
  }

  // --- 1. General Settings (Sensors and Calculations) ---

  private async scanDevice() {
    if ('usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x2341 },
            { vendorId: 0x2a03 }
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
      alert('Your web browser does not support physical device detection. Please use Google Chrome.');
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
      alert('Your web browser does not support physical device detection. Please use Google Chrome.');
    }
  }

  private async toggleMaterialCount(e: Event) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;
    const isChecked = (e.target as HTMLInputElement).checked;

    try {
      await set(dbRef(db, getCompanyPath(companyKey, DbFolder.APP_DATA, 'material_count')), isChecked);
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
        await set(dbRef(db, getCompanyPath(companyKey, DbFolder.FACTORY_ORDER, 'order_count')), 1);
        this.triggerSuccess('Sequence tracker index reset to 1.');
      } catch (err: any) {
        this.triggerError(err.message);
      }
    }
  }

  // --- 2. Account Preferences ---

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

    if (file.size > 1024 * 1024) {
      this.triggerError('File size exceeds the 1MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      try {
        await updateProfile(user, { photoURL: base64Url });
        const userProfileRef = dbRef(db, getUserProfilePath(user.uid));
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
        const userProfileRef = dbRef(db, getUserProfilePath(user.uid));
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

    if (confirm('Are you sure you want to delete your personal profile and account credentials? This will not affect the shared company factory data if other members exist.')) {
      const password = prompt("To confirm profile deletion, please enter your current password:");
      if (!password) {
        alert('Password verification canceled. Profile deletion aborted.');
        return;
      }

      try {
        const credential = EmailAuthProvider.credential(user.email || '', password);
        await reauthenticateWithCredential(user, credential);

        await remove(dbRef(db, getCompanyPath(companyKey, DbFolder.USERS, user.uid)));
        await remove(dbRef(db, getUserProfilePath(user.uid)));
        await deleteUser(user);

        alert('Your personal profile account was successfully deleted.');
        window.location.reload();
      } catch (err: any) {
        alert(`Profile deletion failed: ${err.message}`);
      }
    }
  }

  private async saveAccountSettings() {
    const user = this.authState.user;
    if (!user) return;

    try {
      if (this.editDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: this.editDisplayName });
        const userProfileRef = dbRef(db, getUserProfilePath(user.uid));
        await update(userProfileRef, { displayname: this.editDisplayName });
      }
      this.triggerSuccess('User profile name successfully updated.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  // --- 3. Authentication Settings ---

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
      const userProfileRef = dbRef(db, getUserProfilePath(user.uid));
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

  private async handleImportBackup(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
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

  private async toggleWebNotifications(e: Event) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;
    const isChecked = (e.target as HTMLInputElement).checked;

    try {
      await set(dbRef(db, getCompanyPath(companyKey, DbFolder.APP_DATA, 'notification')), isChecked);
      this.triggerSuccess(`Web push alerts ${isChecked ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async toggleEmailAlerts(e: Event) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;
    const isChecked = (e.target as HTMLInputElement).checked;

    try {
      await set(dbRef(db, getCompanyPath(companyKey, DbFolder.APP_DATA, 'email_alert')), isChecked);
      this.triggerSuccess(`Critical email alerts ${isChecked ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  // --- 6. Factory & Organization Layout & Team Members ---

  private copyKeychain() {
    const key = this.authState.profile?.key;
    if (!key) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key).then(() => {
        alert(`Keychain ID copied to clipboard!\n\nKey: ${key}\n\nShare this key with new members so they can join your factory as Operators.`);
      }).catch(() => {
        prompt('Copy this Factory Keychain ID:', key);
      });
    } else {
      prompt('Copy this Factory Keychain ID:', key);
    }
  }

  private openManageUsers() {
    this.showManageUsersDialog = true;
  }

  private async transferAdminOwnership(targetUid: string, targetName: string) {
    const currentUser = this.authState.user;
    const companyKey = this.authState.profile?.key;
    if (!currentUser || !companyKey) return;

    if (!confirm(`Are you sure you want to transfer Administrator ownership to ${targetName}?\n\n• ${targetName} will become the sole Factory Administrator.\n• You will step down to Factory Operator.\n\nOnly one Administrator is allowed per factory.`)) {
      return;
    }

    try {
      // 1. Promote target to admin in company directory
      await update(dbRef(db, getCompanyPath(companyKey, DbFolder.USERS, targetUid)), { role: 'admin' });
      // 2. Promote target in user profile (if permitted)
      await update(dbRef(db, getUserProfilePath(targetUid)), { role: 'admin' }).catch(() => {});
      
      // 3. Demote current user to operator in company directory
      await update(dbRef(db, getCompanyPath(companyKey, DbFolder.USERS, currentUser.uid)), { role: 'operator' });
      // 4. Demote current user in user profile
      await update(dbRef(db, getUserProfilePath(currentUser.uid)), { role: 'operator' });

      // 5. Update factory registry admin_uid
      await update(dbRef(db, getFactoriesPath(companyKey)), { admin_uid: targetUid }).catch(() => {});
      await update(dbRef(db, `/data/${companyKey}/factoryData/profile`), { admin_uid: targetUid }).catch(() => {});

      this.triggerSuccess(`Ownership transferred successfully. ${targetName} is now the Factory Administrator.`);
      this.showManageUsersDialog = false;
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      this.triggerError(`Failed to transfer ownership: ${err.message}`);
    }
  }

  private async removeUserFromCompany(uid: string) {
    const companyKey = this.authState.profile?.key;
    if (!companyKey) return;

    if (confirm('Are you sure you want to remove this user from this factory? They will lose access to all factory data.')) {
      try {
        await remove(dbRef(db, getCompanyPath(companyKey, DbFolder.USERS, uid)));
        this.triggerSuccess('User successfully unlinked from factory silo.');
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
      const testSnapshot = await get(dbRef(db, getCompanyPath(this.newKeychainKey, DbFolder.FACTORY_PROFILE)));
      if (!testSnapshot.exists()) {
        alert('Keychain Error: Target keychain references an empty or invalid factory workspace.');
        return;
      }

      const userProfileRef = dbRef(db, getUserProfilePath(user.uid));
      await update(userProfileRef, { key: this.newKeychainKey });
      
      this.showKeychainDialog = false;
      this.triggerSuccess('Keychain switched successfully. Reloading view workspace...');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private openProvisionNewFactory() {
    this.newFactoryCompany = this.editCompany || '';
    this.newFactoryName = '';
    this.newFactoryModel = 'serial';
    this.showNewFactoryDialog = true;
  }

  private async submitNewFactory() {
    const user = this.authState.user;
    if (!user) return;

    if (!this.newFactoryName.trim() || !this.newFactoryCompany.trim()) {
      alert('Please fill in both Factory Name and Company Name.');
      return;
    }

    try {
      const sampleRes = await fetch('/data/sample/sample.json');
      if (!sampleRes.ok) throw new Error('Could not load startup database profile');
      const sampleData = await sampleRes.json();

      if (sampleData.factoryData && sampleData.factoryData.profile) {
        sampleData.factoryData.profile.name = this.newFactoryName.trim();
        sampleData.factoryData.profile.model = this.newFactoryModel;
        sampleData.factoryData.profile.admin_uid = null;
      }

      const factoryDataRef = dbRef(db, '/data');
      const newCompanyRef = push(factoryDataRef);
      const newKey = newCompanyRef.key;
      if (!newKey) throw new Error('Failed to generate new factory ID');

      await set(newCompanyRef, sampleData);

      // Register in factories registry as unclaimed (admin_uid: null)
      const factoryRecordRef = dbRef(db, getFactoriesPath(newKey));
      await set(factoryRecordRef, {
        key: newKey,
        name: this.newFactoryName.trim(),
        company: this.newFactoryCompany.trim(),
        admin_uid: null,
        created_by: user.uid,
        created_at: Date.now()
      });

      this.showNewFactoryDialog = false;
      const createdKey = newKey;
      const createdName = this.newFactoryName.trim();
      this.newFactoryName = '';

      alert(`🎉 New Factory Created!\n\nFactory: ${createdName}\nFactory Keychain ID: ${createdKey}\n\nShare this Keychain ID with the new factory manager. When they register with this key, they will automatically become the Factory Administrator!`);
    } catch (err: any) {
      alert(`Error creating factory: ${err.message}`);
    }
  }

  private async saveFactoryAndOrganizationSettings() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    const companyKey = profile?.key;
    if (!user || !profile || !companyKey) return;

    try {
      const userProfileRef = dbRef(db, getUserProfilePath(user.uid));
      await update(userProfileRef, {
        company: this.editCompany,
        factoryName: this.editFactoryName
      });

      if (profile.role === 'admin' && this.editFactoryName) {
        await update(dbRef(db, getCompanyPath(companyKey, DbFolder.FACTORY_PROFILE)), {
          name: this.editFactoryName
        });
        await update(dbRef(db, getFactoriesPath(companyKey)), {
          name: this.editFactoryName,
          company: this.editCompany
        }).catch(() => {});
      }

      this.triggerSuccess('Factory and Organization details synced successfully.');
    } catch (err: any) {
      this.triggerError(err.message);
    }
  }

  private async terminateServiceAndWipeWorkspace() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    const companyKey = profile?.key;
    if (!user || !profile || !companyKey) return;

    if (profile.role !== 'admin') {
      alert('Unauthorized: Only factory Administrators can terminate services and wipe workspaces.');
      return;
    }

    if (!confirm('🚨 CRITICAL WARNING 🚨\n\nThis will PERMANENTLY ERASE the entire corporate factory workspace database for ALL users. All products, machines, orders, and material histories will be vaporized. This action is irreversible.\n\nAre you absolutely sure you want to proceed?')) {
      return;
    }

    const doubleCheck = prompt('To confirm service termination, please type your active factory Key / Company ID Key:');
    if (doubleCheck !== companyKey) {
      alert('Verification failed. Workspace deletion aborted.');
      return;
    }

    const password = prompt("To execute the final database purge, please enter your password:");
    if (!password) {
      alert('Re-authentication canceled. Purge aborted.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email || '', password);
      await reauthenticateWithCredential(user, credential);

      await remove(dbRef(db, `/data/${companyKey}`));
      await remove(dbRef(db, getFactoriesPath(companyKey))).catch(() => {});
      await remove(dbRef(db, getUserProfilePath(user.uid)));
      await deleteUser(user);

      alert('All factory databases and company subscriptions have been permanently purged. Service terminated.');
      window.location.reload();
    } catch (err: any) {
      alert(`Service termination failed: ${err.message}`);
    }
  }

  override render() {
    const user = this.authState.user;
    const profile = this.authState.profile;
    const appData = this.appDataController.data;
    const avatarUrl = user?.photoURL || '/images/profile/icon-512x512.png';
    const isAdmin = profile?.role === 'admin';

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
              @error=${(e: Event) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('icon-512x512.png')) {
                  target.src = '/images/profile/any.svg';
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
            @input=${(e: Event) => this.editDisplayName = (e.target as HTMLInputElement).value}>
          </md-outlined-text-field>

          <md-filled-button class="btn-block" @click=${this.saveAccountSettings}>Save Account Details</md-filled-button>
          
          <md-outlined-button 
            class="btn-block" 
            @click=${this.deleteAccount} 
            ?disabled=${(this.companyUsersState.data || []).length <= 1}
            style="--md-outlined-button-label-text-color: #c62828; --md-outlined-button-outline-color: #fde8e8;"
            title="Delete your personal profile credentials">
            <md-icon slot="icon">no_accounts</md-icon> 
            Delete User Profile
          </md-outlined-button>
        </div>

        <!-- 3. Authentication Settings -->
        <div class="settings-card">
          <h3 class="card-title">Authentication Settings</h3>
          <md-outlined-text-field 
            label="Email Address" 
            type="email"
            .value=${this.editEmail}
            @input=${(e: Event) => this.editEmail = (e.target as HTMLInputElement).value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="New Password" 
            type="password"
            helperText="Provide password value to change"
            .value=${this.editNewPassword}
            @input=${(e: Event) => this.editNewPassword = (e.target as HTMLInputElement).value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="Current Password" 
            type="password"
            helperText="Enter current password to re-authenticate changes"
            .value=${this.editCurrentPassword}
            @input=${(e: Event) => this.editCurrentPassword = (e.target as HTMLInputElement).value}>
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

        <!-- 6. Factory & Organization Layout -->
        <div class="settings-card">
          <h3 class="card-title">Factory & Organization</h3>

          <md-outlined-text-field 
            label="Factory Name" 
            .value=${this.editFactoryName}
            ?disabled=${!isAdmin}
            helperText=${isAdmin ? 'Name of this specific manufacturing plant' : 'Only Administrator can change factory name'}
            @input=${(e: Event) => this.editFactoryName = (e.target as HTMLInputElement).value}>
          </md-outlined-text-field>

          <md-outlined-text-field 
            label="Company Name" 
            .value=${this.editCompany}
            ?disabled=${!isAdmin}
            @input=${(e: Event) => this.editCompany = (e.target as HTMLInputElement).value}>
          </md-outlined-text-field>

          ${isAdmin ? html`
            <div class="keychain-box">
              <div>
                <strong>Factory Keychain ID:</strong>
                <div class="keychain-key-display">${profile?.key || 'N/A'}</div>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
                <div>
                  <strong>Role:</strong> 
                  <span class="role-badge admin">
                    ADMIN (OWNER)
                  </span>
                </div>
                <md-outlined-button @click=${this.copyKeychain} style="--md-outlined-button-label-text-size: 0.8rem;">
                  <md-icon slot="icon">content_copy</md-icon> Copy Key
                </md-outlined-button>
              </div>
              <span style="font-size:0.76rem; color:#777;">Share this Keychain ID with new members. They will join this factory as Operators.</span>
            </div>

            <md-filled-button class="btn-block" @click=${this.saveFactoryAndOrganizationSettings}>
              Save Factory & Organization
            </md-filled-button>

            <div style="display:flex; gap:8px;">
              <md-outlined-button style="flex:1;" @click=${this.openManageUsers}>Manage Users</md-outlined-button>
              <md-outlined-button style="flex:1;" @click=${this.openKeychainEditor}>Switch Key</md-outlined-button>
            </div>

            <md-outlined-button class="btn-block" @click=${this.openProvisionNewFactory}>
              <md-icon slot="icon">add_business</md-icon> Provision New Factory
            </md-outlined-button>

            <md-outlined-button 
              class="btn-block" 
              @click=${this.terminateServiceAndWipeWorkspace} 
              style="--md-outlined-button-label-text-color: #c62828; --md-outlined-button-outline-color: #fde8e8; margin-top: 4px;">
              <md-icon slot="icon">delete_forever</md-icon> Terminate Factory & Wipe Data
            </md-outlined-button>
          ` : html`
            <div class="keychain-box">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div>
                  <strong>Role:</strong> 
                  <span class="role-badge operator">
                    OPERATOR
                  </span>
                </div>
              </div>
              <span style="font-size:0.76rem; color:#777;">You are an active operator for this factory workspace. Settings and user administration are managed by your factory administrator.</span>
            </div>

            <md-outlined-button class="btn-block" @click=${this.openManageUsers}>
              <md-icon slot="icon">group</md-icon> View Factory Team
            </md-outlined-button>
          `}
        </div>
      </div>

      <!-- Keychain Editor Overlay -->
      ${this.showKeychainDialog ? html`
        <div class="overlay">
          <div class="dialog">
            <h4>Switch Database Keychain</h4>
            <p style="font-size:0.85rem; color:#e53935; line-height:1.4; margin:0;">
              ⚠️ WARNING: Modifying your data keychain will point your user session to a different factory silo. Ensure you have backed up your current data.
            </p>

            <md-outlined-text-field 
              label="Target Factory Keychain ID" 
              .value=${this.newKeychainKey}
              @input=${(e: Event) => this.newKeychainKey = (e.target as HTMLInputElement).value}
              required>
            </md-outlined-text-field>

            <div class="dialog-actions">
              <md-outlined-button @click=${() => this.showKeychainDialog = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.updateKeychain}>Switch Keychain</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Provision New Factory Overlay -->
      ${this.showNewFactoryDialog ? html`
        <div class="overlay">
          <div class="dialog">
            <h4>Provision New Factory Workspace</h4>
            <p style="font-size:0.85rem; color:#555; line-height:1.4; margin:0;">
              Create a new isolated factory workspace. The first user to register with the generated Keychain ID will automatically become the Factory Administrator.
            </p>

            <md-outlined-text-field 
              label="Company Name" 
              .value=${this.newFactoryCompany}
              @input=${(e: Event) => this.newFactoryCompany = (e.target as HTMLInputElement).value}
              required>
            </md-outlined-text-field>

            <md-outlined-text-field 
              label="Factory Name" 
              .value=${this.newFactoryName}
              @input=${(e: Event) => this.newFactoryName = (e.target as HTMLInputElement).value}
              required>
            </md-outlined-text-field>

            <md-outlined-select 
              label="Production Line Model" 
              .value=${this.newFactoryModel} 
              @change=${(e: Event) => this.newFactoryModel = (e.target as HTMLSelectElement).value}>
              <md-select-option value="serial"><div slot="headline">Serial Production</div></md-select-option>
              <md-select-option value="parallel"><div slot="headline">Parallel Line Production</div></md-select-option>
              <md-select-option value="multi"><div slot="headline">Multi-Part Assembly Line</div></md-select-option>
            </md-outlined-select>

            <div class="dialog-actions">
              <md-outlined-button @click=${() => this.showNewFactoryDialog = false}>Cancel</md-outlined-button>
              <md-filled-button @click=${this.submitNewFactory}>Create Factory</md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Manage Users Dialog Overlay -->
      ${this.showManageUsersDialog ? html`
        <div class="overlay">
          <div class="dialog" style="max-width:560px;">
            <h4>${isAdmin ? 'Manage Factory Members' : 'Factory Team Members'}</h4>
            <p style="font-size:0.85rem; color:#666; margin:0;">
              ${isAdmin 
                ? 'Members associated with this factory. Strictly one Administrator per factory.' 
                : 'Current active team members associated with this factory workspace.'}
            </p>

            <div class="users-list">
              ${(this.companyUsersState.data || []).length === 0 ? html`
                <span style="font-style:italic; color:#888; text-align:center; padding:12px;">
                  ${isAdmin ? 'No members found. Share your Keychain ID for operators to join.' : 'No other members found.'}
                </span>
              ` : (this.companyUsersState.data || []).map((u: CompanyUserData) => {
                const isMemberAdmin = u.role === 'admin';
                return html`
                  <div class="user-list-item">
                    <div class="user-item-details">
                      <img 
                        class="user-item-avatar" 
                        src="${u.photoURL || '/images/profile/icon-512x512.png'}" 
                        @error=${(e: Event) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('icon-512x512.png')) {
                            target.src = '/images/profile/any.svg';
                          }
                        }} />
                      <div class="user-item-info">
                        <span class="user-item-name">${u.displayname || 'User'} ${u.uid === user?.uid ? '(You)' : ''}</span>
                        <span class="user-item-email">${u.email}</span>
                      </div>
                    </div>

                    <div class="user-item-actions">
                      <span class="role-badge ${isMemberAdmin ? 'admin' : 'operator'}">
                        ${isMemberAdmin ? 'ADMIN (OWNER)' : 'OPERATOR'}
                      </span>

                      ${isAdmin && !isMemberAdmin ? html`
                        <md-outlined-button 
                          style="--md-outlined-button-label-text-size: 0.72rem; padding: 0 8px;"
                          @click=${() => this.transferAdminOwnership(u.uid, u.displayname || u.email)}
                          title="Transfer Factory Administrator ownership to this user">
                          Transfer Admin
                        </md-outlined-button>
                        <md-icon-button 
                          @click=${() => this.removeUserFromCompany(u.uid)} 
                          title="Remove Operator from Factory">
                          <md-icon style="color:#d32f2f;">person_remove</md-icon>
                        </md-icon-button>
                      ` : ''}
                    </div>
                  </div>
                `;
              })}
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
