const cryptoJS = require('crypto-js');
require('dotenv').config();

const SECRET_KEY = process.env.AES_SECRET || 'fallback_secret_key_change_in_prod';

const encrypt = (text) => {
  return cryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

const decrypt = (encryptedText) => {
  const bytes = cryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
  return bytes.toString(cryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };
