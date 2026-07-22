import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import { Router } from '@vaadin/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from './config/firebase.js';
import { userContext, UserContextValue, UserProfile } from './context/userContext.js';

// Material Design 3 Imports
import '@material/web/iconbutton/icon-button.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/icon/icon.js';

@customElement('view-app')
export class ViewApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100vh;
      font-family: 'Roboto', sans-serif;
      overflow: hidden;
    }
    .loading-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background-color: #fafafa;
    }
    .loading-spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #202020;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Layout styling */
    .app-container {
      display: flex;
      height: 100vh;
    }
    
    /* Responsive side drawer */
    aside {
      width: 260px;
      background-color: #ffffff;
      border-right: 1px solid rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: transform 0.3s ease;
    }
    .drawer-logo-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }
    .drawer-logo {
      width: 80px;
      height: 80px;
      margin-bottom: 12px;
    }
    .drawer-title {
      font-size: 1.8rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
    }
    .drawer-subtitle {
      font-size: 0.85rem;
      color: #777;
      margin: 4px 0 0 0;
    }
    nav {
      flex: 1;
      padding: 12px 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      color: #202020;
      text-decoration: none;
      font-weight: 500;
      margin-bottom: 4px;
      transition: background-color 0.2s, color 0.2s;
    }
    .nav-item:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
    .nav-item.active {
      background-color: #202020;
      color: #ffffff;
    }
    .drawer-footer {
      padding: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }
    .user-profile-small {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      width: 100%;
    }
    .user-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: #eee;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }
    .user-details {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    .user-name {
      font-weight: 500;
      font-size: 1rem;
      margin: 0;
      color: #202020;
    }
    .user-version {
      font-size: 0.75rem;
      color: #888888;
      margin: 2px 0 0 0;
    }
    .logout-btn {
      width: 100%;
      height: 40px;
      background-color: #ffffff;
      border: 1px solid #202020;
      color: #202020;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
      transition: background-color 0.2s, color 0.2s;
    }
    .logout-btn:hover {
      background-color: #202020;
      color: #ffffff;
    }

    /* Main viewport area */
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #fafafa;
      overflow: hidden;
    }
    header {
      height: 64px;
      background-color: #ffffff;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      padding: 0 24px;
      justify-content: space-between;
    }
    .page-title {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
    }
    .content-outlet {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    [hidden] {
      display: none !important;
    }

    /* Mobile handling overlay */
    .menu-btn {
      display: none;
    }

    @media (max-width: 768px) {
      aside {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 100;
        transform: translateX(-100%);
      }
      aside.open {
        transform: translateX(0);
      }
      .menu-btn {
        display: inline-block;
      }
      .backdrop {
        display: none;
        position: fixed;
        top: 0; right: 0; bottom: 0; left: 0;
        background: rgba(0,0,0,0.4);
        z-index: 99;
      }
      .backdrop.open {
        display: block;
      }
    }
  `;

  @state() private authState: UserContextValue = { user: null, profile: null, loading: true };
  @state() private drawerOpen = false;
  @state() private activeRoute = 'dashboard';
  @state() private headerTitle = 'Dashboard';

  @query('#outlet') private outlet!: HTMLDivElement;

  private userProvider = new ContextProvider(this, {
    context: userContext,
    initialValue: this.authState
  });

  private router!: Router;
  private profileUnsubscribe: (() => void) | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.initAuth();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupProfileListener();
  }

  private initAuth() {
    onAuthStateChanged(auth, (user) => {
      this.cleanupProfileListener();

      if (user) {
        // Setup database listener for profile
        const userProfileRef = ref(db, `/user/${user.uid}`);
        this.profileUnsubscribe = onValue(userProfileRef, 
          (snapshot) => {
            const profile = snapshot.val() as UserProfile | null;
            this.updateAuthState({
              user,
              profile,
              loading: false
            });
            this.handleAuthNavigation(true);
          },
          () => {
            this.updateAuthState({
              user,
              profile: null,
              loading: false
            });
            this.handleAuthNavigation(true);
          }
        );
      } else {
        this.updateAuthState({
          user: null,
          profile: null,
          loading: false
        });
        this.handleAuthNavigation(false);
      }
    });
  }

  private updateAuthState(value: UserContextValue) {
    this.authState = value;
    this.userProvider.setValue(value);
  }

  private cleanupProfileListener() {
    if (this.profileUnsubscribe) {
      this.profileUnsubscribe();
      this.profileUnsubscribe = null;
    }
  }

  private handleAuthNavigation(authenticated: boolean) {
    const path = window.location.pathname;
    
    if (authenticated) {
      if (path === '/login' || path === '/') {
        Router.go('/app/dashboard');
      }
    } else {
      if (path.startsWith('/app')) {
        Router.go('/login');
      }
    }
  }

  protected override firstUpdated() {
    this.initRouter();
  }

  private initRouter() {
    this.router = new Router(this.outlet);
    
    this.router.setRoutes([
      {
        path: '/',
        redirect: '/login'
      },
      {
        path: '/login',
        component: 'view-login',
        action: async () => {
          await import('./view-login.js');
          this.activeRoute = 'login';
        }
      },
      {
        path: '/app/dashboard',
        component: 'view-dashboard',
        action: async () => {
          await import('./dashboard/view-dashboard.js');
          this.activeRoute = 'dashboard';
          this.headerTitle = 'Overview Dashboard';
        }
      },
      {
        path: '/app/setup',
        component: 'view-setup',
        action: async () => {
          await import('./setup/view-setup.js');
          this.activeRoute = 'setup';
          this.headerTitle = 'Setup';
        }
      },
      {
        path: '/app/plan',
        component: 'view-plan',
        action: async () => {
          await import('./plan/view-plan.js');
          this.activeRoute = 'plan';
          this.headerTitle = 'Plan';
        }
      },
      {
        path: '/app/track',
        component: 'view-track',
        action: async () => {
          await import('./track/view-track.js');
          this.activeRoute = 'track';
          this.headerTitle = 'Track';
        }
      },
      {
        path: '/app/settings',
        component: 'view-settings',
        action: async () => {
          await import('./settings/view-settings.js');
          this.activeRoute = 'settings';
          this.headerTitle = 'Settings';
        }
      },
      {
        path: '(.*)',
        redirect: '/login'
      }
    ]);

    // Keep activeRoute up to date with browser back/forward buttons
    window.addEventListener('vaadin-router-location-changed', (e: any) => {
      const routePath = e.detail.location.pathname;
      if (routePath.includes('/dashboard')) {
        this.activeRoute = 'dashboard';
        this.headerTitle = 'Overview Dashboard';
      } else if (routePath.includes('/setup')) {
        this.activeRoute = 'setup';
        this.headerTitle = 'Setup';
      } else if (routePath.includes('/plan')) {
        this.activeRoute = 'plan';
        this.headerTitle = 'Plan';
      } else if (routePath.includes('/track')) {
        this.activeRoute = 'track';
        this.headerTitle = 'Track';
      } else if (routePath.includes('/settings')) {
        this.activeRoute = 'settings';
        this.headerTitle = 'Settings';
      } else if (routePath.includes('/login')) {
        this.activeRoute = 'login';
      }
    });
  }

  private async logout() {
    try {
      await signOut(auth);
      Router.go('/login');
    } catch (err) {
      console.error('Logout error', err);
    }
  }

  override render() {
    const showLayout = this.authState.user !== null && this.activeRoute !== 'login';
    const profile = this.authState.profile;
    const avatarUrl = profile?.photoURL || '/images/profile/default.svg';

    return html`
      <!-- Fixed Loading Screen Overlay -->
      ${this.authState.loading ? html`
        <div class="loading-screen">
          <div class="loading-spinner"></div>
          <h2>Establishing Session Connection...</h2>
        </div>
      ` : ''}

      <div class="app-container" ?hidden=${this.authState.loading}>
        <!-- Overlay backdrop for mobile -->
        <div class="backdrop ${this.drawerOpen ? 'open' : ''}" @click=${() => this.drawerOpen = false}></div>

        <aside class="${this.drawerOpen ? 'open' : ''}" ?hidden=${!showLayout}>
          <div class="drawer-logo-container">
            <img class="drawer-logo" src="/images/logo/logo.svg" alt="IMES Logo"/>
            <h1 class="drawer-title">IMES</h1>
            <p class="drawer-subtitle">Your Production Helper</p>
          </div>

          <nav>
            <a class="nav-item ${this.activeRoute === 'dashboard' ? 'active' : ''}" href="/app/dashboard" @click=${() => this.drawerOpen = false}>
              <md-icon>dashboard</md-icon>
              Dashboard
            </a>
            <a class="nav-item ${this.activeRoute === 'setup' ? 'active' : ''}" href="/app/setup" @click=${() => this.drawerOpen = false}>
              <md-icon>settings_accessibility</md-icon>
              Setup
            </a>
            <a class="nav-item ${this.activeRoute === 'plan' ? 'active' : ''}" href="/app/plan" @click=${() => this.drawerOpen = false}>
              <md-icon>schedule</md-icon>
              Plan
            </a>
            <a class="nav-item ${this.activeRoute === 'track' ? 'active' : ''}" href="/app/track" @click=${() => this.drawerOpen = false}>
              <md-icon>query_stats</md-icon>
              Track
            </a>
            <a class="nav-item ${this.activeRoute === 'settings' ? 'active' : ''}" href="/app/settings" @click=${() => this.drawerOpen = false}>
              <md-icon>settings</md-icon>
              Settings
            </a>
          </nav>

          <div class="drawer-footer">
            <button class="logout-btn" @click=${this.logout}>Log Out</button>
            <div class="user-profile-small">
              <img class="user-avatar" src="${avatarUrl}" alt="Profile Avatar"/>
              <div class="user-details">
                <p class="user-name">${profile?.displayname || 'User Profile'}</p>
                <p class="user-version">Version 2.0.0</p>
              </div>
            </div>
          </div>
        </aside>

        <main>
          <header ?hidden=${!showLayout}>
            <div style="display: flex; align-items: center; gap: 12px;">
              <md-icon-button class="menu-btn" @click=${() => this.drawerOpen = !this.drawerOpen}>
                <md-icon>menu</md-icon>
              </md-icon-button>
              <h2 class="page-title">${this.headerTitle}</h2>
            </div>
          </header>

          <div class="content-outlet" id="outlet"></div>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'view-app': ViewApp;
  }
}
