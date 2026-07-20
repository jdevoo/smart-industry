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
});
