import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, sendEmailVerification } from 'firebase/auth';
import { ref as dbRef, push, set } from 'firebase/database';
import { auth, db } from './config/firebase.js';

// Import Material 3 Components
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/checkbox/checkbox.js';

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
    md-outlined-text-field {
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
    .toast-alert {
      padding: 12px 16px;
      border-radius: 6px;
      margin-top: 16px;
      font-size: 0.95rem;
      text-align: center;
    }
    .toast-error {
      background-color: #fde8e8;
      color: #e53935;
      border: 1px solid #f8b4b4;
    }
    .toast-success {
      background-color: #eafaf1;
      color: #2e7d32;
      border: 1px solid #c3e6cb;
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
  @state() private company = '';
  @state() private phone = '';

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
      // Route transition event or handled by router state change
      this.dispatchEvent(new CustomEvent('auth-success', { bubbles: true, composed: true }));
    } catch (err: any) {
      this.errorMsg = this.getReadableError(err.code);
    }
  }

  private async register() {
    this.clearAlerts();
    if (!this.email || !this.password || !this.company || !this.phone) {
      this.errorMsg = 'Please fill in the registration form completely.';
      return;
    }

    try {
      // Fetch sample database layout using fetch API
      const sampleRes = await fetch('/data/sample/sample.json');
      if (!sampleRes.ok) throw new Error('Could not load startup database profile');
      const sampleData = await sampleRes.json();

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
      const user = userCredential.user;

      // Update Profile Details
      await updateProfile(user, {
        displayName: 'Untitled'
      });

      // Send Verification Email
      await sendEmailVerification(user);

      // Create new Factory Company ID Node inside Realtime Database
      const factoryDataRef = dbRef(db, '/data');
      const newCompanyRef = push(factoryDataRef);
      const keyid = newCompanyRef.key;

      if (!keyid) throw new Error('Failed to generate company key ID');

      // Seed setup profile
      const userProfileRef = dbRef(db, `/user/${user.uid}`);
      await set(userProfileRef, {
        company: this.company,
        created: Math.round(Date.now() / 1000),
        displayname: 'Untitled',
        email: this.email,
        key: keyid,
        photoURL: null,
        phone: this.phone,
        role: 'admin',
        setup: false
      });

      // Seed factory with sample metadata structure
      await set(newCompanyRef, sampleData);

      this.successMsg = "Register successful. We've sent an activation confirmation link to your inbox.";
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

          ${this.errorMsg ? html`<div class="toast-alert toast-error">${this.errorMsg}</div>` : ''}
          ${this.successMsg ? html`<div class="toast-alert toast-success">${this.successMsg}</div>` : ''}
        </article>
      </section>
    `;
  }

  private renderLoginForm() {
    return html`
      <form @submit=${this._handleLoginSubmit}>
        <div class="form-title">
          <h2>User Login</h2>
        </div>
        <div class="form-group">
          <md-outlined-text-field
            label="Email address"
            type="email"
            .value=${this.email}
            @input=${(e: any) => this.email = e.target.value}
            required>
          </md-outlined-text-field>
          <md-outlined-text-field
            label="Password"
            type="password"
            .value=${this.password}
            @input=${(e: any) => this.password = e.target.value}
            required>
          </md-outlined-text-field>
        </div>
        <div class="checkbox-container">
          <md-checkbox
            id="keepSession"
            ?checked=${this.remember}
            @change=${(e: any) => this.remember = e.target.checked}>
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
    return html`
      <form @submit=${this._handleRegisterSubmit}>
        <div class="form-title">
          <h2>Register Company</h2>
        </div>
        <div class="form-group">
          <md-outlined-text-field
            label="Email address"
            type="email"
            .value=${this.email}
            @input=${(e: any) => this.email = e.target.value}
            required>
          </md-outlined-text-field>
          <md-outlined-text-field
            label="New password"
            type="password"
            .value=${this.password}
            @input=${(e: any) => this.password = e.target.value}
            required>
          </md-outlined-text-field>
          <md-outlined-text-field
            label="Company name"
            .value=${this.company}
            @input=${(e: any) => this.company = e.target.value}
            required>
          </md-outlined-text-field>
          <md-outlined-text-field
            label="Phone (+XX XXXX XXXX X)"
            type="tel"
            .value=${this.phone}
            @input=${(e: any) => this.phone = e.target.value}
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
      <form @submit=${this._handleResetSubmit}>
        <div class="form-title">
          <h2>Reset your password</h2>
          <p>Enter the email you used to signup with and we'll send you a link to reset your password.</p>
        </div>
        <div class="form-group">
          <md-outlined-text-field
            label="Email address"
            type="email"
            .value=${this.email}
            @input=${(e: any) => this.email = e.target.value}
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
