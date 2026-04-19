import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import authenticate from '../middleware/authenticate.js';
import { asyncHandler, AppError, logger } from '../middleware/errorHandler.js';

const router = Router();

// -- Zod schemas --------------------------------------------------------------
const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  authKey: z.string().min(64).regex(/^[0-9a-f]+$/i, 'authKey must be hex'),
  salt: z.string().length(32).regex(/^[0-9a-f]+$/i, 'salt must be 32 hex chars'),
});

const loginSchema = z.object({
  username: z.string().min(1),
  authKey: z.string().min(1),
});

// Dummy hash for timing-safe comparison when user is not found
const DUMMY_HASH = bcrypt.hashSync('dummy_timing_safe_placeholder', 12);

// -- POST /register -----------------------------------------------------------
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, authKey, salt } = registerSchema.parse(req.body);

    const existing = await User.findOne({ username });
    if (existing) {
      throw new AppError('Username already taken', 409);
    }

    // Hash the authKey (NOT the master password — server never sees it)
    const hashedKey = await bcrypt.hash(authKey, 12);

    await User.create({ username, password: hashedKey, salt });
    res.status(201).json({ message: 'Account created' });
  })
);

// -- GET /salt/:username ------------------------------------------------------
// Returns salt for PBKDF2 derivation; returns fake salt for unknown users
// to prevent username enumeration
router.get(
  '/salt/:username',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      // Return a deterministic-looking random salt to prevent enumeration
      const fakeSalt = crypto
        .createHash('sha256')
        .update(req.params.username + 'anti-enum-pepper')
        .digest('hex')
        .slice(0, 32);
      return res.json({ salt: fakeSalt });
    }

    res.json({ salt: user.salt });
  })
);

// -- POST /login --------------------------------------------------------------
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, authKey } = loginSchema.parse(req.body);

    const user = await User.findOne({ username }).select('+password');

    // Timing-safe: always run bcrypt even if user not found
    const hashToCompare = user ? user.password : DUMMY_HASH;
    const valid = await bcrypt.compare(authKey, hashToCompare);

    if (!user || !valid) {
      logger.warn('Failed login attempt', { username, ip: req.ip });
      throw new AppError('Invalid credentials', 401);
    }

    // Check if 2FA is enabled — if so, require TOTP before issuing tokens
    if (user.totpEnabled) {
      const tempToken = jwt.sign(
        { sub: user._id, purpose: 'totp' },
        process.env.JWT_SECRET,
        { expiresIn: '5m', algorithm: 'HS256' }
      );
      return res.json({ requiresTOTP: true, tempToken });
    }

    // No 2FA — issue tokens directly
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

// -- POST /refresh ------------------------------------------------------------
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new AppError('Refresh token missing', 401);
    }

    // Decode expired access token to get userId (without verifying expiry)
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Access token required for refresh', 401);
    }

    let payload;
    try {
      payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        ignoreExpiration: true,
      });
    } catch {
      throw new AppError('Invalid access token', 401);
    }

    const user = await User.findById(payload.sub).select(
      '+refreshTokenHash +refreshTokenExpiry'
    );

    if (
      !user ||
      !user.refreshTokenHash ||
      !user.refreshTokenExpiry ||
      user.refreshTokenExpiry < new Date()
    ) {
      throw new AppError('Refresh token expired or invalid', 401);
    }

    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!valid) {
      throw new AppError('Invalid refresh token', 401);
    }

    const accessToken = jwt.sign(
      { sub: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m', algorithm: 'HS256' }
    );

    res.json({ accessToken, expiresIn: 900 });
  })
);

// -- POST /logout (requires auth) --------------------------------------------
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshTokenHash: '', refreshTokenExpiry: '' },
    });

    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    res.json({ message: 'Logged out' });
  })
);

export default router;
