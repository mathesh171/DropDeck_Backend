const bcrypt = require('bcryptjs')
const db = require('../config/database')
const { generateAuthToken } = require('../utils/tokenGenerator')
const { HTTP_STATUS } = require('../config/constants')
const { logger } = require('../utils/logger')
const User = require('../models/User')
const { sendWelcomeEmail, sendVerificationEmail } = require('../services/emailService')
const path = require('path')
const fs = require('fs')


const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: 'Email already registered' })
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
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
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
    const [users] = await db.query('SELECT user_id, name, email, role, created_at, last_login, profilephoto FROM users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    const user = users[0]
    if (user.profilephoto) {
      user.avatar_url = `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/avatars/${user.profilephoto}`
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
    const { name } = req.body
    await db.query('UPDATE users SET name = ? WHERE user_id = ?', [name, userId])
    res.status(HTTP_STATUS.OK).json({ message: 'Profile updated successfully' })
  } catch (error) {
    logger.error('Update profile error:', error)
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

    const avatarUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/avatars/${filename}`

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


const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { currentPassword, newPassword } = req.body
    const [users] = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash)
    if (!isMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Current password is incorrect' })
    }
    const salt = await bcrypt.genSalt(10)
    const newPasswordHash = await bcrypt.hash(newPassword, salt)
    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newPasswordHash, userId])
    res.status(HTTP_STATUS.OK).json({ message: 'Password changed successfully' })
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
  uploadAvatar,
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification
}
