import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [32, 'Username must be at most 32 characters'],
      match: [/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, digits, _ . -'],
      index: true,
    },
    // Stores bcrypt hash of the derived authKey — NOT the master password
    password: {
      type: String,
      required: true,
      select: false, // never returned in queries by default
    },
    // Hex-encoded 16-byte salt used for PBKDF2 derivation on the client
    salt: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^[0-9a-f]{32}$/i.test(v),
        message: 'Salt must be 32 hex characters',
      },
    },
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpiry: { type: Date, select: false },
    // TOTP 2FA fields
    totpSecret: { type: String, select: false },
    totpEnabled: { type: Boolean, default: false },
    totpBackupCodes: { type: [String], select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokenHash;
        delete ret.refreshTokenExpiry;
        delete ret.totpSecret;
        delete ret.totpBackupCodes;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model('User', userSchema);
