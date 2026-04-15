// Utility to convert ArrayBuffer to Hex String
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility to convert Hex String to ArrayBuffer
function hexToBuffer(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

export const generateSalt = () => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(salt);
};

export const deriveMasterKey = async (password, saltHex) => {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const saltBuffer = hexToBuffer(saltHex);
  
  // High iterations for PBKDF2 deriving AES-GCM key
  const masterKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export to derive auth key
    ['encrypt', 'decrypt']
  );

  return masterKey;
};

// Derive the token for authenticating to the server (so we never send Master Password or Master Key)
export const deriveAuthKey = async (masterKey) => {
  // Export master key raw format
  const rawKey = await window.crypto.subtle.exportKey('raw', masterKey);
  // Hash the master key using SHA-256
  const hash = await window.crypto.subtle.digest('SHA-256', rawKey);
  return bufferToHex(hash);
};

export const encryptPassword = async (plaintext, masterKey) => {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM
  
  // AES-GCM in Web Crypto API automatically appends a 16-byte auth tag to the ciphertext
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    masterKey,
    enc.encode(plaintext)
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  // Separate ciphertext and AuthTag
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    encryptedData: bufferToHex(ciphertext.buffer),
    iv: bufferToHex(iv.buffer),
    authTag: bufferToHex(authTag.buffer) // Using authTag terminology to fulfill exact requirements
  };
};

export const decryptPassword = async (encryptedDataHex, ivHex, authTagHex, masterKey) => {
  try {
    const ciphertext = hexToBuffer(encryptedDataHex);
    const authTag = hexToBuffer(authTagHex);
    const iv = hexToBuffer(ivHex);

    // Recombine ciphertext + authTag for Web Crypto API
    const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    combined.set(new Uint8Array(ciphertext), 0);
    combined.set(new Uint8Array(authTag), ciphertext.byteLength);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      masterKey,
      combined.buffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "DECRYPTION_FAILED";
  }
};
