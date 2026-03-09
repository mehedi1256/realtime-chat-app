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
