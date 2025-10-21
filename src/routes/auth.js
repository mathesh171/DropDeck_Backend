const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');

// Registration validators
const registerValidators = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];

// Login validators
const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Routes
router.post('/register', registerValidators, validate, register);
router.post('/login', loginValidators, validate, login);
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.delete('/account', authenticateToken, deleteAccount);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);


router.get('/verify', authenticateToken, (req, res) => {
  // If authenticateToken middleware passes, token is valid
  res.status(200).json({
    valid: true,
    user: {
      id: req.user.user_id,
      username: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
