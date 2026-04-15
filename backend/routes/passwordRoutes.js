const express = require('express');
const router = express.Router();
const { getPasswords, addPassword, updatePassword, deletePassword } = require('../controllers/passwordController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getPasswords)
  .post(protect, addPassword);

router.route('/:id')
  .put(protect, updatePassword)
  .delete(protect, deletePassword);

module.exports = router;
