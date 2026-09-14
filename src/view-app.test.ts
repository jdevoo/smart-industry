// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { ViewApp } from './view-app.js';
import './view-app.js';

describe('view-app Custom Element Test Suite', () => {
  beforeAll(() => {
    // Basic Custom Element setup
    if (!customElements.get('view-app')) {
      customElements.define('view-app', ViewApp);
    }
  });

  it('should define custom elements properly', () => {
    const el = document.createElement('view-app');
    expect(el).toBeInstanceOf(ViewApp);
    expect(el.tagName.toLowerCase()).toBe('view-app');
  });

  it('should boot into active loading state initially', async () => {
    const el = document.createElement('view-app') as ViewApp;
    document.body.appendChild(el);
    
    // Allow Lit's asynchronous updates to settle
    await el.updateComplete;
    
    const loadingHeader = el.shadowRoot?.querySelector('h2');
    expect(loadingHeader?.textContent).toContain('Establishing Session Connection...');
    
    // Cleanup DOM
    document.body.removeChild(el);
  });

  it('should display suspended notice when profile status is inactive', async () => {
    const el = document.createElement('view-app') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    el.updateAuthState({
      user: { uid: 'op-deactivated', email: 'deactivated@factory.com' },
      profile: {
        company: 'Roong',
        created: 123456,
        displayname: 'Former Operator',
        email: 'deactivated@factory.com',
        key: '-Key123',
        photoURL: null,
        phone: '+12345678',
        role: 'operator',
        setup: true,
        status: 'inactive'
      },
      loading: false
    });
    await el.updateComplete;

    const suspendedTitle = el.shadowRoot?.querySelector('h2');
    expect(suspendedTitle?.textContent).toBe('Account Suspended');

    const appContainer = el.shadowRoot?.querySelector('.app-container');
    expect(appContainer?.hasAttribute('hidden')).toBe(true);

    document.body.removeChild(el);
  });
});
