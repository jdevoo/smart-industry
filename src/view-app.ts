import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { ContextProvider } from '@lit/context';
import { Router } from '@vaadin/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, update, get, set } from 'firebase/database';
import { auth, db } from './config/firebase.js';
import { userContext, UserContextValue, UserProfile } from './context/userContext.js';
import { FirebaseQueryController } from './controllers/FirebaseQueryController.js';
import { FirebaseDocController } from './controllers/FirebaseDocController.js';
import { DbFolder, getCompanyPath, getUserProfilePath, getFactoriesPath, getSystemPath } from './config/db-paths.js';

// Top-level route view imports for instant, delay-free navigation
import './view-login.js';
import './dashboard/view-dashboard.js';
import './setup/view-setup.js';
import './plan/view-plan.js';
import './track/view-track.js';
import './settings/view-settings.js';

import {
  ordersContext,
  machinesContext,
  stationsContext,
  productsContext,
  customersContext,
  inventoryContext,
  devicesContext,
  jobsContext,
  commitContext,
  notificationsContext,
  warehouseContext,
  companyUsersContext,
  scheduleDataContext,
  scheduleConfigContext,
  operationContext,
  performanceContext,
  historyContext,
  factoryProfileContext
} from './context/dataContexts.js';

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
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    aside.collapsed {
      width: 72px;
    }
    aside.collapsed .drawer-brand-container,
    aside.collapsed .nav-text,
    aside.collapsed .user-details,
    aside.collapsed .logout-btn {
      display: none !important;
    }
    aside.collapsed .nav-item {
      justify-content: center;
      padding: 12px 0;
      margin: 4px 8px;
    }
    aside.collapsed .drawer-footer {
      padding: 12px 8px;
    }
    aside.collapsed .user-profile-small {
      gap: 0;
    }
    aside.collapsed .user-avatar {
      width: 40px;
      height: 40px;
    }

    .drawer-header-row {
      display: flex;
      align-items: center;
      padding: 0 12px; /* Standardize left offset to exactly 12px */
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      height: 64px;
      box-sizing: border-box;
      transition: padding 0.3s;
      gap: 12px; /* 12px gap to align text start to exactly 72px */
    }
    aside.collapsed .drawer-header-row {
      padding: 0;
      justify-content: center;
    }
    .desktop-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: #202020;
      padding: 0;
      margin: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      transition: background-color 0.2s, transform 0.1s;
      flex-shrink: 0;
    }
    .desktop-toggle-btn:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
    .desktop-toggle-btn:active {
      transform: scale(0.95);
    }
    .desktop-toggle-btn md-icon {
      --md-icon-size: 24px;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    .drawer-brand-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      transition: opacity 0.3s;
    }
    .drawer-title {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0;
      color: #202020;
      white-space: nowrap;
      line-height: 1.1;
    }
    .drawer-subtitle {
      font-size: 0.72rem;
      color: #777;
      margin: 2px 0 0 0;
      font-weight: 400;
      white-space: nowrap;
      line-height: 1.1;
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
      transition: background-color 0.2s, color 0.2s, justify-content 0.3s, padding 0.3s;
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
    .user-role {
      font-size: 0.72rem;
      color: #777;
      margin: 2px 0 0 0;
      letter-spacing: 0.5px;
      font-weight: 500;
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
      box-sizing: border-box;
    }
    .page-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .page-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .factory-header-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: #f7f9fa;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 20px;
      font-size: 0.84rem;
      font-weight: 500;
      color: #202020;
    }
    .factory-header-chip md-icon {
      font-size: 18px;
      --md-icon-size: 18px;
      color: #555;
    }
    .factory-header-name {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .role-badge {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 2px 7px;
      border-radius: 10px;
      text-transform: uppercase;
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
    .user-factory-tag {
      font-size: 0.72rem;
      color: #666;
      margin: 4px 0 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      max-width: 190px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    /* Toggle buttons display styles */
    .mobile-menu-btn {
      display: none;
    }

    @media (max-width: 768px) {
      .mobile-menu-btn {
        display: inline-flex; /* Fix baseline offset of inline-block */
      }
      .desktop-toggle-btn {
        display: none !important;
      }
      aside {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 100;
        transform: translateX(-100%);
        width: 260px !important;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      aside.open {
        transform: translateX(0) !important;
      }
      aside.collapsed {
        transform: translateX(-100%) !important;
      }
      aside.open .drawer-brand-container,
      aside.open .nav-text,
      aside.open .user-details,
      aside.open .logout-btn {
        display: block !important;
      }
      aside.open .nav-item {
        justify-content: flex-start !important;
        padding: 12px 16px !important;
        margin: 0 0 4px 0 !important;
      }
      aside.open .drawer-footer {
        padding: 16px !important;
      }
      aside.open .user-avatar {
        width: 80px !important;
        height: 80px !important;
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
  @state() private drawerOpen = true; // Default to open/expanded on desktop
  @state() private activeRoute = 'dashboard';
  @state() private headerTitle = 'Dashboard';

  @query('#outlet') private outlet!: HTMLDivElement;

  private userProvider = new ContextProvider(this, {
    context: userContext,
    initialValue: this.authState
  });

  // Global Real-time Firebase Queries (instantiated ONCE at the parent level)
  private ordersController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.ORDER_DATA) : null
  );

  private machinesController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_MACHINE) : null
  );

  private stationsController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_STATION) : null
  );

  private productsController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_PRODUCT) : null
  );

  private customersController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_CUSTOMER) : null
  );

  private inventoryController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_INVENTORY) : null
  );

  private devicesController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_DEVICE) : null
  );

  private jobsController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.TRACKING_DATA) : null
  );

  private notificationsController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.NOTIFICATION_DATA) : null
  );

  private warehouseController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.WAREHOUSE_DATA) : null
  );

  private scheduleDataQueryController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.SCHEDULE_DATA) : null
  );

  private companyUsersQueryController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.USERS) : null
  );

  // Global Real-time Firebase Documents
  private scheduleController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_SCHEDULE) : null
  );

  private operationController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_OPERATION) : null
  );

  private performanceController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.PERFORMANCE_DATA) : null
  );

  private factoryProfileController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.FACTORY_PROFILE) : null
  );

  private historyController = new FirebaseDocController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.HISTORY_DATA) : null
  );

  private commitController = new FirebaseQueryController(this, () =>
    this.authState.profile?.key ? getCompanyPath(this.authState.profile.key, DbFolder.COMMIT_DATA) : null
  );

  // Global Context Providers to expose reactive states down the DOM tree
  private ordersProvider = new ContextProvider(this, { context: ordersContext, initialValue: { data: [], loading: true, error: null } });
  private machinesProvider = new ContextProvider(this, { context: machinesContext, initialValue: { data: [], loading: true, error: null } });
  private stationsProvider = new ContextProvider(this, { context: stationsContext, initialValue: { data: [], loading: true, error: null } });
  private productsProvider = new ContextProvider(this, { context: productsContext, initialValue: { data: [], loading: true, error: null } });
  private customersProvider = new ContextProvider(this, { context: customersContext, initialValue: { data: [], loading: true, error: null } });
  private inventoryProvider = new ContextProvider(this, { context: inventoryContext, initialValue: { data: [], loading: true, error: null } });
  private devicesProvider = new ContextProvider(this, { context: devicesContext, initialValue: { data: [], loading: true, error: null } });
  private jobsProvider = new ContextProvider(this, { context: jobsContext, initialValue: { data: [], loading: true, error: null } });
  private notificationsProvider = new ContextProvider(this, { context: notificationsContext, initialValue: { data: [], loading: true, error: null } });
  private warehouseProvider = new ContextProvider(this, { context: warehouseContext, initialValue: { data: [], loading: true, error: null } });
  private companyUsersProvider = new ContextProvider(this, { context: companyUsersContext, initialValue: { data: [], loading: true, error: null } });
  private scheduleDataProvider = new ContextProvider(this, { context: scheduleDataContext, initialValue: { data: [], loading: true, error: null } });

  private scheduleProvider = new ContextProvider(this, { context: scheduleConfigContext, initialValue: { data: null, loading: true, error: null } });
  private operationProvider = new ContextProvider(this, { context: operationContext, initialValue: { data: null, loading: true, error: null } });
  private performanceProvider = new ContextProvider(this, { context: performanceContext, initialValue: { data: null, loading: true, error: null } });
  private factoryProfileProvider = new ContextProvider(this, { context: factoryProfileContext, initialValue: { data: null, loading: true, error: null } });
  private historyProvider = new ContextProvider(this, { context: historyContext, initialValue: { data: null, loading: true, error: null } });
  private commitProvider = new ContextProvider(this, { context: commitContext, initialValue: { data: [], loading: true, error: null } });

  override updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // Sync active query controller states to context providers
    this.ordersProvider.setValue({ data: this.ordersController.data, loading: this.ordersController.loading, error: this.ordersController.error });
    this.machinesProvider.setValue({ data: this.machinesController.data, loading: this.machinesController.loading, error: this.machinesController.error });
    this.stationsProvider.setValue({ data: this.stationsController.data, loading: this.stationsController.loading, error: this.stationsController.error });
    this.productsProvider.setValue({ data: this.productsController.data, loading: this.productsController.loading, error: this.productsController.error });
    this.customersProvider.setValue({ data: this.customersController.data, loading: this.customersController.loading, error: this.customersController.error });
    this.inventoryProvider.setValue({ data: this.inventoryController.data, loading: this.inventoryController.loading, error: this.inventoryController.error });
    this.devicesProvider.setValue({ data: this.devicesController.data, loading: this.devicesController.loading, error: this.devicesController.error });
    this.jobsProvider.setValue({ data: this.jobsController.data, loading: this.jobsController.loading, error: this.jobsController.error });
    this.notificationsProvider.setValue({ data: this.notificationsController.data, loading: this.notificationsController.loading, error: this.notificationsController.error });
    this.warehouseProvider.setValue({ data: this.warehouseController.data, loading: this.warehouseController.loading, error: this.warehouseController.error });
    this.companyUsersProvider.setValue({ data: this.companyUsersQueryController.data, loading: this.companyUsersQueryController.loading, error: this.companyUsersQueryController.error });
    this.scheduleDataProvider.setValue({ data: this.scheduleDataQueryController.data, loading: this.scheduleDataQueryController.loading, error: this.scheduleDataQueryController.error });
    this.commitProvider.setValue({ data: this.commitController.data, loading: this.commitController.loading, error: this.commitController.error });

    // Sync active document controller states to context providers
    this.scheduleProvider.setValue({ data: this.scheduleController.data, loading: this.scheduleController.loading, error: this.scheduleController.error });
    this.operationProvider.setValue({ data: this.operationController.data, loading: this.operationController.loading, error: this.operationController.error });
    this.performanceProvider.setValue({ data: this.performanceController.data, loading: this.performanceController.loading, error: this.performanceController.error });
    this.factoryProfileProvider.setValue({ data: this.factoryProfileController.data, loading: this.factoryProfileController.loading, error: this.factoryProfileController.error });
    this.historyProvider.setValue({ data: this.historyController.data, loading: this.historyController.loading, error: this.historyController.error });
  }

  private router!: Router;
  private profileUnsubscribe: (() => void) | null = null;
  private _boundResizeHandler = this._handleResize.bind(this);

  override connectedCallback() {
    super.connectedCallback();
    this.drawerOpen = window.innerWidth > 768;
    window.addEventListener('resize', this._boundResizeHandler);
    this.initAuth();
  }

  override disconnectedCallback() {
    window.removeEventListener('resize', this._boundResizeHandler);
    super.disconnectedCallback();
    this.cleanupProfileListener();
  }

  private _handleResize() {
    const isDesktop = window.innerWidth > 768;
    if (!isDesktop && this.drawerOpen) {
      this.drawerOpen = false;
    }
  }

  private initAuth() {
    onAuthStateChanged(auth, (user) => {
      this.cleanupProfileListener();

      if (user) {
        // Setup database listener for profile
        const userProfileRef = ref(db, getUserProfilePath(user.uid));
        this.profileUnsubscribe = onValue(userProfileRef, 
          (snapshot) => {
            const profile = snapshot.val() as UserProfile | null;
            
            // Sync user data to corporate workspace directory for Manage Users features
            if (profile && profile.key) {
              const companyUserRef = ref(db, getCompanyPath(profile.key, DbFolder.USERS, user.uid));
              update(companyUserRef, {
                uid: user.uid,
                displayname: profile.displayname || user.displayName || 'Untitled User',
                email: profile.email || user.email || '',
                role: profile.role || 'operator',
                photoURL: profile.photoURL || null
              }).catch((e) => console.warn('User directory sync bypassed:', e.message));

              // Register/sync factory entry in the central registry if missing
              const factoryRef = ref(db, getFactoriesPath(profile.key));
              get(factoryRef).then((facSnap) => {
                if (!facSnap.exists()) {
                  set(factoryRef, {
                    key: profile.key,
                    company: profile.company || 'Company',
                    name: profile.company || 'Factory',
                    admin_uid: profile.role === 'admin' ? user.uid : null,
                    created_at: Date.now()
                  }).catch(() => {});
                } else {
                  const facData = facSnap.val();
                  if (!facData.admin_uid && profile.role === 'admin') {
                    update(factoryRef, { admin_uid: user.uid }).catch(() => {});
                  }
                }
              }).catch(() => {});

              // Ensure system super-admin reference is recorded
              const sysRef = ref(db, getSystemPath());
              get(sysRef).then((sysSnap) => {
                if (!sysSnap.exists() && profile.role === 'admin') {
                  set(sysRef, { super_admin_uid: user.uid, created_at: Date.now() }).catch(() => {});
                }
              }).catch(() => {});
            }

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
        action: () => {
          this.activeRoute = 'login';
        }
      },
      {
        path: '/app/dashboard',
        component: 'view-dashboard',
        action: () => {
          this.activeRoute = 'dashboard';
          this.headerTitle = 'Overview Dashboard';
        }
      },
      {
        path: '/app/setup',
        component: 'view-setup',
        action: () => {
          this.activeRoute = 'setup';
          this.headerTitle = 'Setup';
        }
      },
      {
        path: '/app/plan',
        component: 'view-plan',
        action: () => {
          this.activeRoute = 'plan';
          this.headerTitle = 'Plan';
        }
      },
      {
        path: '/app/track',
        component: 'view-track',
        action: () => {
          this.activeRoute = 'track';
          this.headerTitle = 'Track';
        }
      },
      {
        path: '/app/settings',
        component: 'view-settings',
        action: () => {
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
    window.addEventListener('vaadin-router-location-changed', (e: Event) => {
      const customEvent = e as CustomEvent;
      const routePath = customEvent.detail.location.pathname;
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
    const avatarUrl = profile?.photoURL || '/images/profile/icon-512x512.png';
    const factoryName = this.factoryProfileController.data?.name || profile?.company || 'Factory';
    const companyName = profile?.company || 'IMES MES';

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

        <aside class="${this.drawerOpen ? 'open' : 'collapsed'}" ?hidden=${!showLayout}>
          <div class="drawer-header-row">
            <button class="desktop-toggle-btn" @click=${() => this.drawerOpen = !this.drawerOpen} title="Toggle Drawer">
              <md-icon>menu</md-icon>
            </button>
            <div class="drawer-brand-container">
              <h1 class="drawer-title">IMES</h1>
              <p class="drawer-subtitle">Win the day</p>
            </div>
          </div>

          <nav>
            <a class="nav-item ${this.activeRoute === 'dashboard' ? 'active' : ''}" href="/app/dashboard" @click=${() => { if (window.innerWidth <= 768) this.drawerOpen = false; }}>
              <md-icon>dashboard</md-icon>
              <span class="nav-text">Dashboard</span>
            </a>
            <a class="nav-item ${this.activeRoute === 'setup' ? 'active' : ''}" href="/app/setup" @click=${() => { if (window.innerWidth <= 768) this.drawerOpen = false; }}>
              <md-icon>settings_accessibility</md-icon>
              <span class="nav-text">Setup</span>
            </a>
            <a class="nav-item ${this.activeRoute === 'plan' ? 'active' : ''}" href="/app/plan" @click=${() => { if (window.innerWidth <= 768) this.drawerOpen = false; }}>
              <md-icon>schedule</md-icon>
              <span class="nav-text">Plan</span>
            </a>
            <a class="nav-item ${this.activeRoute === 'track' ? 'active' : ''}" href="/app/track" @click=${() => { if (window.innerWidth <= 768) this.drawerOpen = false; }}>
              <md-icon>query_stats</md-icon>
              <span class="nav-text">Track</span>
            </a>
            <a class="nav-item ${this.activeRoute === 'settings' ? 'active' : ''}" href="/app/settings" @click=${() => { if (window.innerWidth <= 768) this.drawerOpen = false; }}>
              <md-icon>settings</md-icon>
              <span class="nav-text">Settings</span>
            </a>
          </nav>

          <div class="drawer-footer">
            <button class="logout-btn" @click=${this.logout}>Log Out</button>
            <div class="user-profile-small">
              <img 
                class="user-avatar" 
                src="${avatarUrl}" 
                alt="Profile Avatar"
                @error=${(e: Event) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('icon-512x512.png')) {
                    target.src = '/images/profile/any.svg';
                  }
                }} />
              <div class="user-details">
                <p class="user-name">${profile?.displayname || 'User Profile'}</p>
                <div style="display:flex; align-items:center; gap:6px; margin:2px 0;">
                  <span class="role-badge ${profile?.role === 'admin' ? 'admin' : 'operator'}">
                    ${profile?.role ? profile.role.toUpperCase() : 'OPERATOR'}
                  </span>
                </div>
                <span class="user-factory-tag" title="Factory: ${factoryName}">
                  <md-icon style="font-size:14px; --md-icon-size:14px;">factory</md-icon>
                  ${factoryName}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <main>
          <header ?hidden=${!showLayout}>
            <div class="page-header-left">
              <md-icon-button class="mobile-menu-btn" @click=${() => this.drawerOpen = !this.drawerOpen}>
                <md-icon>menu</md-icon>
              </md-icon-button>
              <h2 class="page-title">${this.headerTitle}</h2>
            </div>
            <div class="page-header-right">
              <div class="factory-header-chip" title="Active Factory: ${factoryName} (${companyName})">
                <md-icon>factory</md-icon>
                <span class="factory-header-name">${factoryName}</span>
                <span class="role-badge ${profile?.role === 'admin' ? 'admin' : 'operator'}">
                  ${profile?.role ? profile.role.toUpperCase() : 'OPERATOR'}
                </span>
              </div>
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
