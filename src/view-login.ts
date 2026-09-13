import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, sendEmailVerification } from 'firebase/auth';
import { ref as dbRef, push, set, get, onValue, update } from 'firebase/database';
import { auth, db } from './config/firebase.js';
import { getFactoriesPath, getSystemPath } from './config/db-paths.js';

// Import Material 3 Components
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/icon/icon.js';

export interface AvailableFactory {
  key: string;
  name: string;
  company: string;
  admin_uid: string | null;
}

@customElement('view-login')
export class ViewLogin extends LitElement {
  static override styles = css`
    :host {
      display: block;
      background-color: #ffffff;
      min-height: 100vh;
      font-family: 'Roboto', sans-serif;
    }
    section {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 16px;
    }
    article {
      width: 100%;
      max-width: 480px;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      background: #ffffff;
    }
    .logo {
      display: block;
      margin: 0 auto 24px auto;
      width: 120px;
      height: 120px;
    }
    .form-title {
      text-align: center;
      margin-bottom: 24px;
    }
    .form-title h2 {
      font-size: 1.80rem;
      font-weight: 500;
      color: #202020;
      margin: 0;
    }
    .form-title p {
      color: #666;
      font-size: 0.95rem;
      margin-top: 8px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }
    md-outlined-text-field, md-outlined-select {
      width: 100%;
    }
    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      font-size: 0.95rem;
    }
    .btn-block {
      width: 100%;
      margin-top: 12px;
    }
    .links-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 20px;
      text-align: center;
    }
    .links-container a {
      color: #0070c9;
      text-decoration: none;
      font-size: 0.95rem;
    }
    .links-container a:hover {
      text-decoration: underline;
    }
    .form-alert {
      padding: 12px 16px;
      border-radius: 6px;
      margin-top: 16px;
      font-size: 0.95rem;
      text-align: center;
    }
    .alert-error {
      background-color: #fde8e8;
      color: #e53935;
      border: 1px solid #f8b4b4;
    }
    .alert-success {
      background-color: #eafaf1;
      color: #2e7d32;
      border: 1px solid #c3e6cb;
    }
    .role-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.88rem;
    }
    .role-indicator md-icon {
      font-size: 24px;
      --md-icon-size: 24px;
      flex-shrink: 0;
    }
    .role-indicator.admin {
      background-color: #eafaf1;
      border: 1px solid #c3e6cb;
      color: #155724;
    }
    .role-indicator.operator {
      background-color: #e8f4fd;
      border: 1px solid #b8daff;
      color: #004085;
    }
    .role-indicator-title {
      font-weight: 500;
      margin-bottom: 2px;
    }
    .role-indicator-desc {
      font-size: 0.80rem;
      opacity: 0.9;
      line-height: 1.3;
    }
    form {
      display: contents;
    }
  `;

  @state() private currentForm: 'login' | 'register' | 'reset' = 'login';
  @state() private remember = true;
  @state() private errorMsg = '';
  @state() private successMsg = '';

  // Form Field States
  @state() private email = '';
  @state() private password = '';
  @state() private displayName = '';
  @state() private company = '';
  @state() private factoryName = '';
  @state() private phone = '';

  // Factory Directory States
  @state() private availableFactories: AvailableFactory[] = [];
  @state() private selectedFactoryKey = '';
  @state() private customKeychainKey = '';

  private factoriesUnsubscribe: (() => void) | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.listenFactories();
  }

  override disconnectedCallback() {
    if (this.factoriesUnsubscribe) {
      this.factoriesUnsubscribe();
      this.factoriesUnsubscribe = null;
    }
    super.disconnectedCallback();
  }

  private listenFactories() {
    const factoriesRef = dbRef(db, getFactoriesPath());
    this.factoriesUnsubscribe = onValue(factoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.availableFactories = Object.entries(data).map(([k, v]: [string, any]) => ({
          key: k,
          name: v.name || v.company || k,
          company: v.company || 'Company',
          admin_uid: v.admin_uid || null
        }));
        if (!this.selectedFactoryKey && this.availableFactories.length > 0) {
          this.selectedFactoryKey = this.availableFactories[0].key;
        }
      } else {
        this.availableFactories = [];
      }
    }, () => {
    });
  }

  private get selectedFactory(): AvailableFactory | undefined {
    const key = this.selectedFactoryKey === 'custom' ? this.customKeychainKey.trim() : this.selectedFactoryKey;
    return this.availableFactories.find(f => f.key === key);
  }

  private get prospectiveRole(): 'admin' | 'operator' {
    if (this.availableFactories.length === 0) return 'admin';
    const factory = this.selectedFactory;
    if (!factory) return 'operator';
    return factory.admin_uid ? 'operator' : 'admin';
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.currentForm === 'login') {
        this.login();
      } else if (this.currentForm === 'register') {
        this.register();
      } else if (this.currentForm === 'reset') {
        this.resetPassword();
      }
    }
  }

  private _handleLoginSubmit(e: Event) {
    e.preventDefault();
    this.login();
  }

  private _handleRegisterSubmit(e: Event) {
    e.preventDefault();
    this.register();
  }

  private _handleResetSubmit(e: Event) {
    e.preventDefault();
    this.resetPassword();
  }

  private async login() {
    this.clearAlerts();
    if (!this.email || !this.password) {
      this.errorMsg = 'Email or Password cannot be blank';
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, this.email, this.password);
      this.dispatchEvent(new CustomEvent('auth-success', { bubbles: true, composed: true }));
    } catch (err: any) {
      this.errorMsg = this.getReadableError(err.code);
    }
  }

  private async register() {
    this.clearAlerts();
    if (!this.email || !this.password || !this.phone) {
      this.errorMsg = 'Please fill in all required registration fields.';
      return;
    }

    const isInitialBootstrap = this.availableFactories.length === 0;

    let targetKey = '';
    let targetCompany = '';
    let targetFactoryName = '';
    let willBeAdmin = false;

    if (isInitialBootstrap) {
      if (!this.company || !this.factoryName) {
        this.errorMsg = 'Please provide both Company Name and Factory Name for initial setup.';
        return;
      }
      willBeAdmin = true;
      targetCompany = this.company.trim();
      targetFactoryName = this.factoryName.trim();
    } else {
      const chosenKey = this.selectedFactoryKey === 'custom' ? this.customKeychainKey.trim() : this.selectedFactoryKey;
      if (!chosenKey) {
        this.errorMsg = 'Please select a factory or enter a Factory Keychain ID.';
        return;
      }

      let factory = this.availableFactories.find(f => f.key === chosenKey);
      if (!factory) {
        try {
          const snap = await get(dbRef(db, getFactoriesPath(chosenKey)));
          if (snap.exists()) {
            const val = snap.val();
            factory = {
              key: chosenKey,
              name: val.name || val.company || chosenKey,
              company: val.company || 'Company',
              admin_uid: val.admin_uid || null
            };
          }
        } catch {
          // ignore
        }
      }

      if (!factory) {
        this.errorMsg = 'Invalid Factory Keychain ID. Please check with your administrator.';
        return;
      }

      targetKey = factory.key;
      targetCompany = factory.company;
      targetFactoryName = factory.name;
      willBeAdmin = !factory.admin_uid;
    }

    try {
      let sampleData: any = null;
      if (isInitialBootstrap) {
        const sampleRes = await fetch('/data/sample/sample.json');
        if (!sampleRes.ok) throw new Error('Could not load startup database profile');
        sampleData = await sampleRes.json();
        if (sampleData.factoryData && sampleData.factoryData.profile) {
          sampleData.factoryData.profile.name = targetFactoryName;
        }
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
      const user = userCredential.user;

      const userDisplayName = this.displayName.trim() || (willBeAdmin ? 'Factory Admin' : 'Operator');

      await updateProfile(user, {
        displayName: userDisplayName
      });

      await sendEmailVerification(user);

      if (isInitialBootstrap) {
        const factoryDataRef = dbRef(db, '/data');
        const newCompanyRef = push(factoryDataRef);
        targetKey = newCompanyRef.key!;
        if (!targetKey) throw new Error('Failed to generate company key ID');

        await set(newCompanyRef, sampleData);

        await set(dbRef(db, getSystemPath()), {
          super_admin_uid: user.uid,
          created_at: Date.now()
        });
      }

      // Update factory registry
      const factoryRecordRef = dbRef(db, getFactoriesPath(targetKey));
      if (isInitialBootstrap) {
        await set(factoryRecordRef, {
          key: targetKey,
          name: targetFactoryName,
          company: targetCompany,
          admin_uid: user.uid,
          created_by: user.uid,
          created_at: Date.now()
        });
      } else if (willBeAdmin) {
        await update(factoryRecordRef, {
          admin_uid: user.uid
        });
        await update(dbRef(db, `/data/${targetKey}/factoryData/profile`), {
          admin_uid: user.uid
        }).catch(() => {});
      }

      const assignedRole = willBeAdmin ? 'admin' : 'operator';

      // Seed personal user profile
      const userProfileRef = dbRef(db, `/user/${user.uid}`);
      await set(userProfileRef, {
        company: targetCompany,
        factoryName: targetFactoryName,
        created: Math.round(Date.now() / 1000),
        displayname: userDisplayName,
        email: this.email,
        key: targetKey,
        photoURL: null,
        phone: this.phone,
        role: assignedRole,
        isSuperAdmin: isInitialBootstrap,
        setup: false
      });

      // Synchronize to factory users list
      const companyUserRef = dbRef(db, `/data/${targetKey}/users/${user.uid}`);
      await set(companyUserRef, {
        uid: user.uid,
        displayname: userDisplayName,
        email: this.email,
        role: assignedRole,
        photoURL: null
      });

      this.successMsg = `Registration successful as ${assignedRole.toUpperCase()} for "${targetFactoryName}". An activation link was sent to your email.`;
      this.currentForm = 'login';
    } catch (err: any) {
      this.errorMsg = err.message || this.getReadableError(err.code);
    }
  }

  private async resetPassword() {
    this.clearAlerts();
    if (!this.email) {
      this.errorMsg = 'Email address cannot be blank';
      return;
    }

    try {
      await sendPasswordResetEmail(auth, this.email);
      this.successMsg = 'Reset password link has been sent to your email address.';
      this.email = '';
    } catch (err: any) {
      this.errorMsg = this.getReadableError(err.code);
    }
  }

  private clearAlerts() {
    this.errorMsg = '';
    this.successMsg = '';
  }

  private getReadableError(code: string): string {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address format.';
      case 'auth/user-not-found': return 'No registered user matches this email.';
      case 'auth/wrong-password': return 'Incorrect login credentials.';
      case 'auth/email-already-in-use': return 'An account is already linked to this email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      default: return code || 'An unexpected authentication issue occurred.';
    }
  }

  override render() {
    return html`
      <section>
        <article>
          <img class="logo" src="/images/logo/logo.svg" alt="IMES Logo"/>

          ${this.currentForm === 'login' ? this.renderLoginForm() : ''}
          ${this.currentForm === 'register' ? this.renderRegisterForm() : ''}
          ${this.currentForm === 'reset' ? this.renderResetForm() : ''}

          ${this.errorMsg ? html`<div class="form-alert alert-error">${this.errorMsg}</div>` : ''}
          ${this.successMsg ? html`<div class="form-alert alert-success">${this.successMsg}</div>` : ''}
        </article>
      </section>
    `;
  }

  private renderLoginForm() {
    return html`
      <form @submit=${this._handleLoginSubmit} @keydown=${this._handleKeyDown}>
        <div class="form-title">
          <h2>User Login</h2>
        </div>
        <div class="form-group">
          <md-outlined-text-field
            label="Email address"
            type="email"
            .value=${this.email}
            @input=${(e: Event) => this.email = (e.target as HTMLInputElement).value}
            required>
          </md-outlined-text-field>
          <md-outlined-text-field
            label="Password"
            type="password"
            .value=${this.password}
            @input=${(e: Event) => this.password = (e.target as HTMLInputElement).value}
            required>
          </md-outlined-text-field>
        </div>
        <div class="checkbox-container">
          <md-checkbox
            id="keepSession"
            ?checked=${this.remember}
            @change=${(e: Event) => this.remember = (e.target as HTMLInputElement).checked}>
          </md-checkbox>
          <label for="keepSession">Keep me signed in</label>
        </div>
        <md-filled-button type="submit" class="btn-block">Login</md-filled-button>
        <div class="links-container">
          <a href="#" @click=${(e: Event) => { e.preventDefault(); this.currentForm = 'reset'; this.clearAlerts(); }}>Forgot?</a>
          <a href="#" @click=${(e: Event) => { e.preventDefault(); this.currentForm = 'register'; this.clearAlerts(); }}>Don’t have an account? Sign up now.</a>
        </div>
      </form>
    `;
  }

  private renderRegisterForm() {
    const isInitialBootstrap = this.availableFactories.length === 0;

    return html`
      <form @submit=${this._handleRegisterSubmit} @keydown=${this._handleKeyDown}>
        <div class="form-title">
          <h2>${isInitialBootstrap ? 'Register First Factory' : 'Join Factory'}</h2>
          <p>${isInitialBootstrap ? 'Initial system setup: Create your organization & factory as Administrator.' : 'Sign up to access your factory workspace.'}</p>
        </div>

        <div class="form-group">
          ${isInitialBootstrap ? html`
            <div class="role-indicator admin">
              <md-icon>admin_panel_settings</md-icon>
              <div>
                <div class="role-indicator-title">Platform & Factory Administrator</div>
                <div class="role-indicator-desc">Initial system setup. You will be the primary owner and manage factories.</div>
              </div>
            </div>

            <md-outlined-text-field
              label="Company Name"
              .value=${this.company}
              @input=${(e: Event) => this.company = (e.target as HTMLInputElement).value}
              required>
            </md-outlined-text-field>
            <md-outlined-text-field
              label="Factory Name"
              .value=${this.factoryName}
              @input=${(e: Event) => this.factoryName = (e.target as HTMLInputElement).value}
              required>
            </md-outlined-text-field>
          ` : html`
            <md-outlined-select
              label="Select Factory Workspace"
              .value=${this.selectedFactoryKey}
              @change=${(e: Event) => this.selectedFactoryKey = (e.target as HTMLSelectElement).value}>
              ${this.availableFactories.map(f => html`
                <md-select-option value="${f.key}">
                  <div slot="headline">${f.name} (${f.company})</div>
                  <div slot="supporting-text">${f.admin_uid ? 'Admin Assigned • Operator Role' : 'No Admin • You will be Admin'}</div>
                </md-select-option>
              `)}
              <md-select-option value="custom">
                <div slot="headline">Enter Keychain ID Manually...</div>
              </md-select-option>
            </md-outlined-select>

            ${this.selectedFactoryKey === 'custom' ? html`
              <md-outlined-text-field
                label="Factory Keychain ID"
                .value=${this.customKeychainKey}
                @input=${(e: Event) => this.customKeychainKey = (e.target as HTMLInputElement).value}
                helperText="Paste the Keychain ID provided by your factory administrator"
                required>
              </md-outlined-text-field>
            ` : ''}

            <div class="role-indicator ${this.prospectiveRole === 'admin' ? 'admin' : 'operator'}">
              <md-icon>${this.prospectiveRole === 'admin' ? 'stars' : 'badge'}</md-icon>
              <div>
                <div class="role-indicator-title">
                  Role: <strong>${this.prospectiveRole === 'admin' ? 'Factory Administrator' : 'Factory Operator'}</strong>
                </div>
                <div class="role-indicator-desc">
                  ${this.prospectiveRole === 'admin' 
                    ? 'First user for this factory. You will manage topology, orders, and operators.' 
                    : 'An administrator is already managing this factory. You will join with Operator permissions.'}
                </div>
              </div>
            </div>
          `}

          <md-outlined-text-field
            label="Full Name / Display Name"
            .value=${this.displayName}
            @input=${(e: Event) => this.displayName = (e.target as HTMLInputElement).value}
            required>
          </md-outlined-text-field>

          <md-outlined-text-field
            label="Email address"
            type="email"
            .value=${this.email}
            @input=${(e: Event) => this.email = (e.target as HTMLInputElement).value}
            required>
          </md-outlined-text-field>
          <md-outlined-text-field
            label="New password"
            type="password"
            .value=${this.password}
            @input=${(e: Event) => this.password = (e.target as HTMLInputElement).value}
            required>
          </md-outlined-text-field>
          <md-outlined-text-field
            label="Phone (+XX XXXX XXXX X)"
            type="tel"
            .value=${this.phone}
            @input=${(e: Event) => this.phone = (e.target as HTMLInputElement).value}
            required>
          </md-outlined-text-field>
        </div>
        <md-filled-button type="submit" class="btn-block">Register and Login</md-filled-button>
        <div class="links-container">
          <a href="#" @click=${(e: Event) => { e.preventDefault(); this.currentForm = 'login'; this.clearAlerts(); }}>Already have an account? Log in</a>
        </div>
      </form>
    `;
  }

  private renderResetForm() {
    return html`
      <form @submit=${this._handleResetSubmit} @keydown=${this._handleKeyDown}>
        <div class="form-title">
          <h2>Reset your password</h2>
          <p>Enter the email you used to signup with and we'll send you a link to reset your password.</p>
        </div>
        <div class="form-group">
          <md-outlined-text-field
            label="Email address"
            type="email"
            .value=${this.email}
            @input=${(e: Event) => this.email = (e.target as HTMLInputElement).value}
            required>
          </md-outlined-text-field>
        </div>
        <md-filled-button type="submit" class="btn-block">Reset Password</md-filled-button>
        <div class="links-container">
          <a href="#" @click=${(e: Event) => { e.preventDefault(); this.currentForm = 'login'; this.clearAlerts(); }}>Return to login</a>
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-login': ViewLogin;
  }
}
