import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'chatapp-e2e-secret-key-2024';

export const encryptMessage = (message, secret = ENCRYPTION_KEY) => {
  if (!message) return '';
  try {
    return CryptoJS.AES.encrypt(message, secret).toString();
  } catch {
    return message;
  }
};

export const decryptMessage = (ciphertext, secret = ENCRYPTION_KEY) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ciphertext;
  } catch {
    return ciphertext;
  }
};

export const generateConversationKey = (userId1, userId2) => {
  const sorted = [userId1, userId2].sort().join('-');
  return CryptoJS.SHA256(sorted + ENCRYPTION_KEY).toString();
};

/** Shared key for group messages (all members use same key). */
export const generateGroupKey = (groupId) => {
  return CryptoJS.SHA256(`group:${groupId}:${ENCRYPTION_KEY}`).toString();
};

/** Encrypt file content (base64 string) for E2E file messages. Server never sees plaintext. */
export const encryptFileContent = (base64String, secret = ENCRYPTION_KEY) => {
  if (!base64String) return '';
  try {
    return CryptoJS.AES.encrypt(base64String, secret).toString();
  } catch {
    return '';
  }
};

/** Decrypt file content to base64 for E2E file messages. */
export const decryptFileContent = (ciphertext, secret = ENCRYPTION_KEY) => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    return bytes.toString(CryptoJS.enc.Utf8) || '';
  } catch {
    return '';
  }
};
