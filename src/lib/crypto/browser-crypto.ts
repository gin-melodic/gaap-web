import { Encoding } from './encoding';

const ALGO_AES = 'AES-GCM';
const ALGO_HMAC = 'HMAC';
const HASH_SHA256 = 'SHA-256';

// ---------------------------------------------------------
// Key Import
// ---------------------------------------------------------
async function importKey(hexKey: string, usage: 'encrypt' | 'sign'): Promise<CryptoKey> {
  if (!hexKey) {
    throw new Error(`Key cannot be empty (${usage})`);
  }

  // Validate Hex format
  if (!/^[0-9a-fA-F]+$/.test(hexKey)) {
    throw new Error(`Key must be a valid hex string (${usage})`);
  }

  // Validate Key Length (AES-GCM requires 128, 192, or 256 bits)
  // We strictly support 128-bit (32 hex chars) or 256-bit (64 hex chars)
  const length = hexKey.length;
  if (length !== 32 && length !== 64) {
    throw new Error(
      `Invalid key length: ${length} hex chars (${length * 4} bits). ` +
      `Expected 32 chars (128-bit) or 64 chars (256-bit).`
    );
  }

  const rawKey = Encoding.hexToBytes(hexKey);

  if (usage === 'encrypt') {
    return window.crypto.subtle.importKey(
      'raw', rawKey as BufferSource,
      { name: ALGO_AES },
      false,
      ['encrypt', 'decrypt']
    );
  } else {
    return window.crypto.subtle.importKey(
      'raw', rawKey as BufferSource,
      { name: ALGO_HMAC, hash: HASH_SHA256 },
      false,
      ['sign', 'verify']
    );
  }
}

// ---------------------------------------------------------
// Encryption - AES-GCM
// ---------------------------------------------------------
export async function encryptPayload(data: Uint8Array, hexSecret: string): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const key = await importKey(hexSecret, 'encrypt');

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: ALGO_AES, iv: iv },
    key,
    data as BufferSource
  );

  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    iv
  };
}

export async function decryptPayload(encryptedData: Uint8Array, iv: Uint8Array, hexSecret: string): Promise<Uint8Array> {
  const key = await importKey(hexSecret, 'encrypt');

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: ALGO_AES, iv: iv as BufferSource },
      key,
      encryptedData as BufferSource
    );
    return new Uint8Array(decryptedBuffer);
  } catch (e) {
    throw new Error('Decryption failed: Integrity check or key mismatch.' + e);
  }
}

// ---------------------------------------------------------
// Signing - HMAC-SHA256
// ---------------------------------------------------------
export async function signRequest(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  timestamp: string,
  nonce: string,
  hexSecret: string
): Promise<string> {
  const key = await importKey(hexSecret, 'sign');

  // Construct the signature payload: IV + Ciphertext + Timestamp + Nonce
  // Must match the backend verification order strictly
  const payload = new Uint8Array(iv.length + ciphertext.length + timestamp.length + nonce.length);
  let offset = 0;

  payload.set(iv, offset); offset += iv.length;
  payload.set(ciphertext, offset); offset += ciphertext.length;
  payload.set(Encoding.utf8ToBytes(timestamp), offset); offset += timestamp.length;
  payload.set(Encoding.utf8ToBytes(nonce), offset);

  const signatureBuffer = await window.crypto.subtle.sign(
    ALGO_HMAC,
    key,
    payload
  );

  return Encoding.bytesToHex(new Uint8Array(signatureBuffer));
}