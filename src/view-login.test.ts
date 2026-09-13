// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { ViewLogin } from './view-login.js';
import './view-login.js';

describe('view-login Custom Element & Multi-tenant Registration Suite', () => {
  beforeAll(() => {
    if (!HTMLElement.prototype.attachInternals) {
      (HTMLElement.prototype as any).attachInternals = function() {
        return {
          setValidity: () => {},
          checkValidity: () => true,
          reportValidity: () => true,
          setFormValue: () => {},
          validationMessage: '',
          validity: {},
          labels: []
        };
      };
    }

    if (!customElements.get('view-login')) {
      customElements.define('view-login', ViewLogin);
    }
  });

  it('should define view-login custom element properly', () => {
    const el = document.createElement('view-login');
    expect(el).toBeInstanceOf(ViewLogin);
    expect(el.tagName.toLowerCase()).toBe('view-login');
  });

  it('should render login form by default', async () => {
    const el = document.createElement('view-login') as ViewLogin;
    document.body.appendChild(el);
    await el.updateComplete;

    const title = el.shadowRoot?.querySelector('h2');
    expect(title?.textContent).toContain('User Login');

    document.body.removeChild(el);
  });

  it('should reflect initial platform admin setup mode when availableFactories is empty', async () => {
    const el = document.createElement('view-login') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    // Switch to register form
    el.currentForm = 'register';
    el.availableFactories = [];
    await el.updateComplete;

    const title = el.shadowRoot?.querySelector('h2');
    expect(title?.textContent).toContain('Register First Factory');
    expect(el.prospectiveRole).toBe('admin');

    document.body.removeChild(el);
  });

  it('should determine operator role when prospective factory already has an admin', async () => {
    const el = document.createElement('view-login') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    el.currentForm = 'register';
    el.availableFactories = [
      { key: '-FacAlpha', name: 'Alpha Factory', company: 'Alpha Corp', admin_uid: 'uid-admin-123' }
    ];
    el.selectedFactoryKey = '-FacAlpha';
    await el.updateComplete;

    expect(el.prospectiveRole).toBe('operator');
    const roleText = el.shadowRoot?.querySelector('.role-indicator-title');
    expect(roleText?.textContent).toContain('Factory Operator');

    document.body.removeChild(el);
  });

  it('should determine admin role when prospective factory is unclaimed (no admin_uid)', async () => {
    const el = document.createElement('view-login') as any;
    document.body.appendChild(el);
    await el.updateComplete;

    el.currentForm = 'register';
    el.availableFactories = [
      { key: '-FacBeta', name: 'Beta Facility', company: 'Beta Group', admin_uid: null }
    ];
    el.selectedFactoryKey = '-FacBeta';
    await el.updateComplete;

    expect(el.prospectiveRole).toBe('admin');
    const roleText = el.shadowRoot?.querySelector('.role-indicator-title');
    expect(roleText?.textContent).toContain('Factory Administrator');

    document.body.removeChild(el);
  });
});
