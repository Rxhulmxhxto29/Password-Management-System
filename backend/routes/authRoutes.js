const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getSalt } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/salt/:username', getSalt);

module.exports = router;
