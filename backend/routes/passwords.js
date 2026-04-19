import { Router } from 'express';
import { z } from 'zod';
import Password from '../models/Password.js';
import authenticate from '../middleware/authenticate.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();

// All password routes require authentication
router.use(authenticate);

// -- Zod schema for encrypted entry -------------------------------------------
const entrySchema = z.object({
  site: z.string().min(1).max(256).trim(),
  username: z.string().min(1).max(256).trim(),
  encryptedData: z.string().min(1),
  iv: z.string().min(1),
  authTag: z.string().min(1),
  category: z.enum(['login', 'card', 'note', 'identity']).default('login'),
  isFavourite: z.boolean().default(false),
});

// -- GET / — paginated list (excludes history for performance) ----------------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      Password.find({ userId: req.user._id })
        .select('-history')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Password.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// -- POST / — create new entry ------------------------------------------------
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = entrySchema.parse(req.body);
    const entry = await Password.create({ ...data, userId: req.user._id });
    res.status(201).json(entry);
  })
);

// -- PUT /:id — update entry (ownership verified) ----------------------------
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = entrySchema.parse(req.body);

    const entry = await Password.findById(req.params.id);
    if (!entry) throw new AppError('Entry not found', 404);
    if (entry.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Forbidden', 403);
    }

    // Store old encrypted values for history before overwriting
    entry._previousEncrypted = {
      encryptedData: entry.encryptedData,
      iv: entry.iv,
      authTag: entry.authTag,
    };

    Object.assign(entry, data);
    await entry.save();

    res.json(entry);
  })
);

// -- DELETE /:id — delete entry (ownership verified) --------------------------
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const entry = await Password.findById(req.params.id);
    if (!entry) throw new AppError('Entry not found', 404);
    if (entry.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Forbidden', 403);
    }

    await entry.deleteOne();
    res.json({ message: 'Entry deleted' });
  })
);

export default router;
