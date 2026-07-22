// polyfill-crypto.cjs
// Ensures compatibility for older Node versions (like v18) with libraries requiring globalThis.crypto
const { webcrypto } = require('node:crypto');

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
} else if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  globalThis.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}
