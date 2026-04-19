import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';

// JWT authentication middleware
// Reads Bearer token, verifies HS256, attaches user to req
const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export default authenticate;
