const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { authValidators } = require('../utils/validators');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} = require('../controllers/authController');

router.post('/register', authValidators.register, validate, register);
router.post('/login', authValidators.login, validate, login);
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);
router.patch('/change-password', authenticateToken, changePassword);
// router.get('/verify-email/:token', verifyEmail);
// router.post('/resend-verification', resendVerification);
// router.delete('/account', authenticateToken, deleteAccount);

module.exports = router;