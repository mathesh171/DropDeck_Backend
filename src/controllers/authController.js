const bcrypt = require('bcryptjs')
const db = require('../config/database')
const { generateAuthToken } = require('../utils/tokenGenerator')
const { HTTP_STATUS } = require('../config/constants')
const { logger } = require('../utils/logger')
const User = require('../models/User')
const { sendWelcomeEmail, sendVerificationEmail, sendPasswordChangeEmail, sendPasswordResetOTPEmail } = require('../services/emailService')
const path = require('path')
const fs = require('fs')

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: 'Email already registered' })
    }
    const existingName = await User.findByName(name)
    if (existingName) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: 'Username already taken' })
    }
    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)
    const userId = await User.create({
      name,
      email,
      password_hash,
      role: 'member',
      authorize: 0
    })
    const { generateRandomToken } = require('../utils/tokenGenerator')
    const verificationToken = generateRandomToken(32)
    await User.setVerificationToken(userId, verificationToken)
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
    sendVerificationEmail(email, name, verificationToken)
    logger.info(`New user registered (unverified): ${email}`)
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        user_id: userId,
        name,
        email,
        verified: false
      }
    })
  } catch (error) {
    logger.error('Registration error:', error)
    next(error)
  }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid credentials' })
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid credentials' })
    }
    const isAuthorized = await User.isAuthorized(user.user_id)
    if (!isAuthorized) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        verified: false
      })
    }
    await User.updateLastLogin(user.user_id)
    const token = generateAuthToken(user.user_id)
    logger.info(`User logged in: ${email}`)
    res.status(HTTP_STATUS.OK).json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: true
      }
    })
  } catch (error) {
    logger.error('Login error:', error)
    next(error)
  }
}

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params
    if (!token) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Verification token is required' })
    }
    const user = await User.verifyByToken(token)
    if (!user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid or expired verification token' })
    }
    if (user.authorize === 1) {
      return res.status(HTTP_STATUS.OK).json({
        message: 'Email already verified!',
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          verified: true
        }
      })
    }
    logger.info(`Email verified for user: ${user.email}`)
    res.status(HTTP_STATUS.OK).json({
      message: 'Email verified successfully! You can now login.',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        verified: true
      }
    })
  } catch (error) {
    logger.error('Email verification error:', error)
    next(error)
  }
}

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Email is required' })
    }
    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    const isAuthorized = await User.isAuthorized(user.user_id)
    if (isAuthorized) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Email is already verified' })
    }
    const { generateRandomToken } = require('../utils/tokenGenerator')
    const verificationToken = generateRandomToken(32)
    await User.setVerificationToken(user.user_id, verificationToken)
    sendVerificationEmail(user.email, user.name, verificationToken)
    logger.info(`Verification email resent to: ${email}`)
    res.status(HTTP_STATUS.OK).json({ message: 'Verification email sent! Please check your inbox.' })
  } catch (error) {
    logger.error('Resend verification error:', error)
    next(error)
  }
}

const logout = async (req, res, next) => {
  try {
    logger.info(`User ${req.user.user_id} logged out`)
    res.status(HTTP_STATUS.OK).json({ message: 'Logout successful' })
  } catch (error) {
    next(error)
  }
}

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const [users] = await db.query('SELECT user_id, name, email, role, created_at, last_login, profilephoto, bio FROM users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    const user = users[0]
    if (user.profilephoto) {
      user.avatar_url = `${process.env.BASE_URL}/uploads/avatars/${user.profilephoto}`
    }
    res.status(HTTP_STATUS.OK).json({ user })
  } catch (error) {
    logger.error('Get profile error:', error)
    next(error)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { name, bio } = req.body

    if (name !== undefined) {
      if (!name || name.trim().length < 3) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Username must be at least 3 characters' })
      }
      const [existingUser] = await db.query('SELECT user_id FROM users WHERE name = ? AND user_id != ?', [name.trim(), userId])
      if (existingUser.length > 0) {
        return res.status(HTTP_STATUS.CONFLICT).json({ error: 'Username already taken' })
      }
    }

    const updates = []
    const values = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name.trim())
    }
    if (bio !== undefined) {
      updates.push('bio = ?')
      values.push(bio)
    }

    if (updates.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No fields to update' })
    }

    values.push(userId)
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, values)
    
    res.status(HTTP_STATUS.OK).json({ message: 'Profile updated successfully' })
  } catch (error) {
    logger.error('Update profile error:', error)
    next(error)
  }
}

const checkUsernameAvailability = async (req, res, next) => {
  try {
    const { username } = req.query
    const userId = req.user.user_id

    if (!username || username.trim().length < 3) {
      return res.status(HTTP_STATUS.OK).json({ available: false, message: 'Username must be at least 3 characters' })
    }

    const [users] = await db.query('SELECT user_id FROM users WHERE name = ? AND user_id != ?', [username.trim(), userId])
    
    res.status(HTTP_STATUS.OK).json({ 
      available: users.length === 0,
      message: users.length === 0 ? 'Username available' : 'Username already taken'
    })
  } catch (error) {
    logger.error('Check username error:', error)
    next(error)
  }
}

const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'No file uploaded' })
    }

    const [users] = await db.query('SELECT profilephoto FROM users WHERE user_id = ?', [userId])
    
    if (users.length === 0) {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }

    const oldPhoto = users[0].profilephoto
    
    if (oldPhoto) {
      const oldPhotoPath = path.join(__dirname, '../../uploads/avatars', oldPhoto)
      if (fs.existsSync(oldPhotoPath)) {
        try {
          fs.unlinkSync(oldPhotoPath)
        } catch (err) {
          logger.error('Error deleting old avatar:', err)
        }
      }
    }

    const filename = req.file.filename

    await db.query('UPDATE users SET profilephoto = ? WHERE user_id = ?', [filename, userId])

    const avatarUrl = `${process.env.BASE_URL}/uploads/avatars/${filename}`

    logger.info(`Avatar uploaded for user ${userId}`)
    res.status(HTTP_STATUS.OK).json({ 
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl,
      filename 
    })
  } catch (error) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {}
    }
    logger.error('Upload avatar error:', error)
    next(error)
  }
}

const verifyOldPassword = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { oldPassword } = req.body

    if (!oldPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Old password is required' })
    }

    const [users] = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }

    const isMatch = await bcrypt.compare(oldPassword, users[0].password_hash)
    
    res.status(HTTP_STATUS.OK).json({ 
      verified: isMatch,
      message: isMatch ? 'Password verified' : 'Incorrect password'
    })
  } catch (error) {
    logger.error('Verify old password error:', error)
    next(error)
  }
}

const generatePasswordResetOTP = async (req, res, next) => {
  try {
    const userId = req.user.user_id

    const [users] = await db.query('SELECT email, name FROM users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await db.query('DELETE FROM password_reset_otps WHERE user_id = ?', [userId])
    await db.query(
      'INSERT INTO password_reset_otps (user_id, otp, expires_at) VALUES (?, ?, ?)',
      [userId, otp, expiresAt]
    )

    await sendPasswordResetOTPEmail(users[0].email, users[0].name, otp)

    logger.info(`Password reset OTP generated for user ${userId}`)
    res.status(HTTP_STATUS.OK).json({ 
      message: 'OTP sent to your email',
      expires_in: '1 hour'
    })
  } catch (error) {
    logger.error('Generate OTP error:', error)
    next(error)
  }
}

const verifyPasswordResetOTP = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { otp } = req.body

    if (!otp || otp.length !== 6) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid OTP format' })
    }

    const [otpRecords] = await db.query(
      'SELECT * FROM password_reset_otps WHERE user_id = ? AND otp = ? AND is_used = 0 AND expires_at > NOW()',
      [userId, otp]
    )

    if (otpRecords.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid or expired OTP' })
    }

    res.status(HTTP_STATUS.OK).json({ 
      verified: true,
      message: 'OTP verified successfully'
    })
  } catch (error) {
    logger.error('Verify OTP error:', error)
    next(error)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { oldPassword, otp, newPassword } = req.body

    if (!newPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'New password is required' })
    }

    if (!oldPassword && !otp) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Either old password or OTP is required' })
    }

    const [users] = await db.query('SELECT email, name, password_hash FROM users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }

    if (oldPassword) {
      const isMatch = await bcrypt.compare(oldPassword, users[0].password_hash)
      if (!isMatch) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Current password is incorrect' })
      }
    } else if (otp) {
      const [otpRecords] = await db.query(
        'SELECT * FROM password_reset_otps WHERE user_id = ? AND otp = ? AND is_used = 0 AND expires_at > NOW()',
        [userId, otp]
      )

      if (otpRecords.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid or expired OTP' })
      }

      await db.query('UPDATE password_reset_otps SET is_used = 1 WHERE otp_id = ?', [otpRecords[0].otp_id])
    }

    const salt = await bcrypt.genSalt(10)
    const newPasswordHash = await bcrypt.hash(newPassword, salt)
    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newPasswordHash, userId])

    await sendPasswordChangeEmail(users[0].email, users[0].name)

    logger.info(`Password changed for user ${userId}`)
    res.status(HTTP_STATUS.OK).json({ message: 'Password changed successfully. Confirmation email sent.' })
  } catch (error) {
    logger.error('Change password error:', error)
    next(error)
  }
}

const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { password } = req.body
    if (!password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Password is required to delete account' })
    }
    const [users] = await db.query('SELECT user_id, email, password_hash, profilephoto FROM users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    const user = users[0]
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Incorrect password. Account deletion failed.' })
    }
    const [adminGroups] = await db.query(
      `SELECT g.group_id, g.group_name FROM chatgroups g JOIN groupmembers gm ON g.group_id = gm.group_id WHERE gm.user_id = ? AND gm.role = 'admin'`,
      [userId]
    )
    if (adminGroups.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Cannot delete account. You are an admin of one or more groups. Please transfer admin role or delete the groups first.',
        admin_groups: adminGroups.map(g => ({ id: g.group_id, name: g.group_name }))
      })
    }

    if (user.profilephoto) {
      const photoPath = path.join(__dirname, '../../uploads/avatars', user.profilephoto)
      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath)
        } catch (err) {
          logger.error('Error deleting user avatar:', err)
        }
      }
    }

    await db.query('DELETE FROM users WHERE user_id = ?', [userId])
    logger.info(`User account deleted: ${user.email} (ID: ${userId})`)
    res.status(HTTP_STATUS.OK).json({ message: 'Account deleted successfully' })
  } catch (error) {
    logger.error('Delete account error:', error)
    next(error)
  }
}

module.exports = {
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
  resendVerification
}
