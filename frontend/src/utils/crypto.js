// Zero-knowledge crypto utilities — uses ONLY the browser's Web Crypto API
// No external crypto libraries needed

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// -- Helpers (internal) -------------------------------------------------------

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// -- Public API ---------------------------------------------------------------

/**
 * Generate a random 16-byte salt as 32-char hex string
 * Used during registration for PBKDF2 derivation
 */
export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(bytes.buffer);
}

/**
 * Derive the AES-256-GCM Master Key from the master password.
 * This key stays in browser memory ONLY — never sent to the server.
 * - 600,000 PBKDF2 iterations (OWASP 2024 recommendation)
 * - extractable: false — key cannot be exported via JavaScript
 */
export async function deriveMasterKey(masterPassword, saltHex) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(hexToBuffer(saltHex)),
      iterations: 600000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable — cannot be read from memory via JS
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive the Auth Key — a SEPARATE derivation sent to the server for login.
 * Uses a DIFFERENT salt (original salt + ':auth' suffix) so it's
 * cryptographically independent from the Master Key.
 */
export async function deriveAuthKey(masterPassword, saltHex) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Different salt: original salt bytes + ':auth' text
  const saltBytes = new Uint8Array(hexToBuffer(saltHex));
  const authSuffix = encoder.encode(':auth');
  const combinedSalt = new Uint8Array(saltBytes.length + authSuffix.length);
  combinedSalt.set(saltBytes);
  combinedSalt.set(authSuffix, saltBytes.length);

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: combinedSalt,
      iterations: 600000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return bufferToHex(bits);
}

/**
 * Encrypt a vault entry payload with AES-256-GCM.
 * Returns base64-encoded { encryptedData, iv, authTag }.
 */
export async function encryptEntry(masterKey, payloadObject) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payloadObject));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    plaintext
  );

  // AES-GCM output = ciphertext + 16-byte auth tag (concatenated)
  const cipherArray = new Uint8Array(cipherBuffer);
  const ciphertext = cipherArray.slice(0, -16);
  const authTag = cipherArray.slice(-16);

  return {
    encryptedData: bufferToBase64(ciphertext.buffer),
    iv: bufferToBase64(iv.buffer),
    authTag: bufferToBase64(authTag.buffer),
  };
}

/**
 * Decrypt a vault entry. Recombines ciphertext + authTag before decryption.
 * Throws clear error if decryption fails (wrong key or tampered data).
 */
export async function decryptEntry(masterKey, { encryptedData, iv, authTag }) {
  try {
    const cipherBytes = new Uint8Array(base64ToBuffer(encryptedData));
    const tagBytes = new Uint8Array(base64ToBuffer(authTag));
    const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
    combined.set(cipherBytes);
    combined.set(tagBytes, cipherBytes.length);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(base64ToBuffer(iv)) },
      masterKey,
      combined.buffer
    );

    return JSON.parse(decoder.decode(plainBuffer));
  } catch {
    throw new Error('Decryption failed — wrong master key or tampered data');
  }
}

/**
 * Cryptographically secure password generator.
 * Uses crypto.getRandomValues (NEVER Math.random).
 * Fisher-Yates shuffle with crypto-random indices.
 */
export function generatePassword({
  length = 20,
  upper = true,
  lower = true,
  digits = true,
  symbols = true,
  excludeAmbiguous = false,
} = {}) {
  const AMBIGUOUS_UPPER = 'OI';
  const AMBIGUOUS_LOWER = 'l';
  const AMBIGUOUS_DIGITS = '01';

  const charsets = {
    upper: excludeAmbiguous
      ? 'ABCDEFGHJKLMNPQRSTUVWXYZ'
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: excludeAmbiguous
      ? 'abcdefghijkmnopqrstuvwxyz'
      : 'abcdefghijklmnopqrstuvwxyz',
    digits: excludeAmbiguous ? '23456789' : '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  };

  let pool = '';
  const required = [];

  if (upper) { pool += charsets.upper; required.push(charsets.upper); }
  if (lower) { pool += charsets.lower; required.push(charsets.lower); }
  if (digits) { pool += charsets.digits; required.push(charsets.digits); }
  if (symbols) { pool += charsets.symbols; required.push(charsets.symbols); }

  if (!pool) pool = charsets.lower;

  // Secure random index helper
  const secureRandom = (max) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };

  // Ensure at least one char from each enabled charset
  const result = required.map((cs) => cs[secureRandom(cs.length)]);

  // Fill remaining length with random chars from full pool
  while (result.length < length) {
    result.push(pool[secureRandom(pool.length)]);
  }

  // Fisher-Yates shuffle with crypto-random indices
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}
