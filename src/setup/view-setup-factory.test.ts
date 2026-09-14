// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { ViewSetupFactory } from './view-setup-factory.js';
import './view-setup-factory.js';

describe('view-setup-factory Custom Element & Role Guarding Suite', () => {
  beforeAll(() => {
    if (!Element.prototype.animate) {
      (Element.prototype as any).animate = function() {
        return {
          finished: Promise.resolve(),
          cancel: () => {},
          addEventListener: () => {},
          removeEventListener: () => {}
        };
      };
    }

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

    if (!customElements.get('view-setup-factory')) {
      customElements.define('view-setup-factory', ViewSetupFactory);
    }
  });

  it('should define view-setup-factory custom element properly', () => {
    const el = document.createElement('view-setup-factory');
    expect(el).toBeInstanceOf(ViewSetupFactory);
    expect(el.tagName.toLowerCase()).toBe('view-setup-factory');
  });

  it('should disable form controls and show read-only indicator for operators', async () => {
    const el = document.createElement('view-setup-factory') as any;
    el.authState = {
      user: { uid: 'op-123' },
      profile: { role: 'operator', key: 'fac-1', company: 'Test Co' },
      loading: false
    };
    el.factoryProfileState = {
      data: { name: 'Alpha Factory', model: 'serial', type: 'jobshop' },
      loading: false,
      error: null
    };
    el.operationState = {
      data: { op_start: '08:00', op_end: '17:00' },
      loading: false,
      error: null
    };
    el.performanceState = {
      data: { optimize: 'disabled', au: 85 },
      loading: false,
      error: null
    };
    el.scheduleConfigState = {
      data: { interval: 1, delay: 10 },
      loading: false,
      error: null
    };

    document.body.appendChild(el);
    await el.updateComplete;

    // Check operator read-only banner
    const readOnlyBanner = el.shadowRoot?.querySelector('.operator-banner');
    expect(readOnlyBanner).not.toBeNull();

    // Check factory name field is disabled
    const nameField = el.shadowRoot?.querySelector('md-outlined-text-field[label="Factory Name"]');
    expect(nameField?.hasAttribute('disabled')).toBe(true);

    // Check submit button is not present, lock message is shown
    const saveBtn = el.shadowRoot?.querySelector('md-filled-button');
    expect(saveBtn).toBeNull();

    const lockText = el.shadowRoot?.querySelector('.submit-bar')?.textContent;
    expect(lockText).toContain('read-only for Operators');

    document.body.removeChild(el);
  });

  it('should enable form controls and show Save Settings button for admins', async () => {
    const el = document.createElement('view-setup-factory') as any;
    el.authState = {
      user: { uid: 'admin-123' },
      profile: { role: 'admin', key: 'fac-1', company: 'Test Co' },
      loading: false
    };
    el.factoryProfileState = {
      data: { name: 'Alpha Factory', model: 'serial', type: 'jobshop' },
      loading: false,
      error: null
    };
    el.operationState = {
      data: { op_start: '08:00', op_end: '17:00' },
      loading: false,
      error: null
    };
    el.performanceState = {
      data: { optimize: 'disabled', au: 85 },
      loading: false,
      error: null
    };
    el.scheduleConfigState = {
      data: { interval: 1, delay: 10 },
      loading: false,
      error: null
    };

    document.body.appendChild(el);
    await el.updateComplete;

    // Check operator read-only banner is NOT present
    const readOnlyBanner = el.shadowRoot?.querySelector('div[style*="Operator View Mode"]');
    expect(readOnlyBanner).toBeNull();

    // Check factory name field is enabled
    const nameField = el.shadowRoot?.querySelector('md-outlined-text-field[label="Factory Name"]');
    expect(nameField?.hasAttribute('disabled')).toBe(false);

    // Check submit button is present
    const saveBtn = el.shadowRoot?.querySelector('md-filled-button');
    expect(saveBtn).not.toBeNull();
    expect(saveBtn?.textContent).toContain('Save Settings');

    document.body.removeChild(el);
  });
});
