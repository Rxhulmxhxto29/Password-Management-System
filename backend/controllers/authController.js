const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

const getSalt = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      // Return a random 404 error instead of identifying user doesn't exist to prevent enumeration?
      // Actually standard practice may just return 404 'User not found'
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ salt: user.salt });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const registerUser = async (req, res) => {
  try {
    const { username, authKey, salt } = req.body;

    if (!username || !authKey || !salt) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the authKey (derived from master password on client side)
    const bcryptSalt = await bcrypt.genSalt(10);
    const hashedAuthKey = await bcrypt.hash(authKey, bcryptSalt);

    const user = await User.create({
      username,
      password: hashedAuthKey,
      salt: salt,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, authKey } = req.body;

    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(authKey, user.password))) {
      res.json({
        _id: user.id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerUser, loginUser, getSalt };
