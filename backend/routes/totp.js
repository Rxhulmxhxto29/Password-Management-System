import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import User from '../models/User.js';
import authenticate from '../middleware/authenticate.js';
import { asyncHandler, AppError, logger } from '../middleware/errorHandler.js';

const router = Router();

// -- POST /totp/setup — Generate TOTP secret and QR code --------------------
router.post(
  '/setup',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User not found', 404);

    if (user.totpEnabled) {
      throw new AppError('2FA is already enabled', 400);
    }

    // Generate a TOTP secret
    const secret = speakeasy.generateSecret({
      name: `SecureVault:${user.username}`,
      issuer: 'SecureVault',
      length: 20,
    });

    // Save secret temporarily (not yet enabled)
    user.totpSecret = secret.base32;
    await User.findByIdAndUpdate(user._id, { totpSecret: secret.base32 });

    // Generate QR code as base64 PNG
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      qrCodeDataUrl,
      manualEntryKey: secret.base32,
    });
  })
);

// -- POST /totp/verify-setup — Verify code and enable 2FA -------------------
router.post(
  '/verify-setup',
  authenticate,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      throw new AppError('Verification code is required', 400);
    }

    const user = await User.findById(req.user._id).select('+totpSecret');
    if (!user || !user.totpSecret) {
      throw new AppError('No 2FA setup in progress', 400);
    }

    if (user.totpEnabled) {
      throw new AppError('2FA is already enabled', 400);
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: token.trim(),
      window: 1, // allow 1 step tolerance (±30 seconds)
    });

    if (!verified) {
      throw new AppError('Invalid verification code', 400);
    }

    // Generate 8 one-time backup codes
    const backupCodes = [];
    const hashedCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(5).toString('hex'); // 10-char hex code
      backupCodes.push(code);
      hashedCodes.push(await bcrypt.hash(code, 10));
    }

    // Enable 2FA
    user.totpEnabled = true;
    user.totpBackupCodes = hashedCodes;
    await user.save();

    logger.info('2FA enabled', { userId: user._id });

    // Return plaintext backup codes — shown ONCE only
    res.json({
      success: true,
      backupCodes,
    });
  })
);

// -- POST /totp/disable — Disable 2FA (requires current code) ---------------
router.post(
  '/disable',
  authenticate,
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw new AppError('TOTP code required to disable 2FA', 400);

    const user = await User.findById(req.user._id).select('+totpSecret');
    if (!user || !user.totpEnabled) {
      throw new AppError('2FA is not enabled', 400);
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: token.trim(),
      window: 1,
    });

    if (!verified) throw new AppError('Invalid verification code', 400);

    user.totpEnabled = false;
    user.totpSecret = undefined;
    user.totpBackupCodes = [];
    await user.save();

    logger.info('2FA disabled', { userId: user._id });
    res.json({ success: true });
  })
);

// -- POST /totp/authenticate — Verify TOTP after login ----------------------
router.post(
  '/authenticate',
  asyncHandler(async (req, res) => {
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
      throw new AppError('Temp token and verification code are required', 400);
    }

    // Verify the temporary token
    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new AppError('Invalid or expired temp token', 401);
    }

    if (payload.purpose !== 'totp') {
      throw new AppError('Invalid token purpose', 401);
    }

    const user = await User.findById(payload.sub).select(
      '+totpSecret +totpBackupCodes'
    );
    if (!user || !user.totpEnabled) {
      throw new AppError('2FA is not enabled for this user', 400);
    }

    const trimmedToken = token.trim();
    let verified = false;

    // Try TOTP verification first (6-digit code)
    if (/^\d{6}$/.test(trimmedToken)) {
      verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: trimmedToken,
        window: 1,
      });
    }

    // If not a 6-digit code or TOTP failed, try backup codes (10-char hex)
    if (!verified && /^[0-9a-f]{10}$/i.test(trimmedToken)) {
      for (let i = 0; i < user.totpBackupCodes.length; i++) {
        const match = await bcrypt.compare(trimmedToken, user.totpBackupCodes[i]);
        if (match) {
          verified = true;
          // Remove used backup code (one-time use)
          user.totpBackupCodes.splice(i, 1);
          await user.save();
          logger.info('Backup code used', {
            userId: user._id,
            remaining: user.totpBackupCodes.length,
          });
          break;
        }
      }
    }

    if (!verified) {
      throw new AppError('Invalid verification code', 401);
    }

    // Issue full access token + refresh token
    const accessToken = jwt.sign(
      { sub: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, expiresIn: 900 });
  })
);

// -- GET /totp/status — Check if 2FA is enabled for current user ------------
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json({ totpEnabled: !!user?.totpEnabled });
  })
);

export default router;
