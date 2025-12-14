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
  checkUsernameAvailability,
  uploadAvatar,
  verifyOldPassword,
  generatePasswordResetOTP,
  verifyPasswordResetOTP,
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');


const avatarDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `avatar-${req.user.user_id}-${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const avatarFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: avatarFileFilter
});

const registerValidators = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];

const loginValidators = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const passwordValidators = [
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];

router.post('/register', registerValidators, validate, register);
router.post('/login', loginValidators, validate, login);
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/check-username', authenticateToken, checkUsernameAvailability);
router.post('/profile/avatar', authenticateToken, avatarUpload.single('avatar'), uploadAvatar);
router.post('/verify-old-password', authenticateToken, verifyOldPassword);
router.post('/generate-password-otp', authenticateToken, generatePasswordResetOTP);
router.post('/verify-password-otp', authenticateToken, verifyPasswordResetOTP);
router.put('/change-password', authenticateToken, passwordValidators, validate, changePassword);
router.delete('/account', authenticateToken, deleteAccount);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

router.get('/verify', authenticateToken, (req, res) => {
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
