import mongoose from 'mongoose';

const historyEntry = new mongoose.Schema(
  {
    encryptedData: String,
    iv: String,
    authTag: String,
  },
  { _id: false }
);

const passwordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    site: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true,
      maxlength: 256,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      maxlength: 256,
    },
    category: {
      type: String,
      enum: ['login', 'card', 'note', 'identity'],
      default: 'login',
    },
    isFavourite: { type: Boolean, default: false },
    // AES-256-GCM ciphertext (base64)
    encryptedData: { type: String, required: true },
    // 12-byte IV (base64)
    iv: { type: String, required: true },
    // 16-byte GCM auth tag (base64)
    authTag: { type: String, required: true },
    // Edit history — last 5 versions
    history: {
      type: [historyEntry],
      default: [],
    },
  },
  { timestamps: true }
);

// Compound index for efficient per-user site lookups
passwordSchema.index({ userId: 1, site: 1 });

// Pre-save hook: push old encrypted values to history on update
passwordSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('encryptedData')) {
    // Get the previous values from the document's original state
    const prev = this.$__delta()?.[1]?.$set;
    if (this._previousEncrypted) {
      this.history.push(this._previousEncrypted);
      // Keep only the last 5 history entries
      if (this.history.length > 5) {
        this.history = this.history.slice(-5);
      }
    }
  }
  next();
});

export default mongoose.model('Password', passwordSchema);
