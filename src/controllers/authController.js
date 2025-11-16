const bcrypt = require('bcryptjs')
const db = require('../config/database')
const { generateAuthToken } = require('../utils/tokenGenerator')
const { HTTP_STATUS } = require('../config/constants')
const { logger } = require('../utils/logger')
const User = require('../models/User')
const { sendWelcomeEmail, sendVerificationEmail } = require('../services/emailService')

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
    const [users] = await db.query('SELECT user_id, name, email, role, created_at, last_login FROM Users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    res.status(HTTP_STATUS.OK).json({ user: users[0] })
  } catch (error) {
    next(error)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { name } = req.body
    await db.query('UPDATE Users SET name = ? WHERE user_id = ?', [name, userId])
    res.status(HTTP_STATUS.OK).json({ message: 'Profile updated successfully' })
  } catch (error) {
    next(error)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.user_id
    const { currentPassword, newPassword } = req.body
    const [users] = await db.query('SELECT password_hash FROM Users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash)
    if (!isMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Current password is incorrect' })
    }
    const salt = await bcrypt.genSalt(10)
    const newPasswordHash = await bcrypt.hash(newPassword, salt)
    await db.query('UPDATE Users SET password_hash = ? WHERE user_id = ?', [newPasswordHash, userId])
    res.status(HTTP_STATUS.OK).json({ message: 'Password changed successfully' })
  } catch (error) {
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
    const [users] = await db.query('SELECT user_id, email, password_hash FROM Users WHERE user_id = ?', [userId])
    if (users.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' })
    }
    const user = users[0]
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Incorrect password. Account deletion failed.' })
    }
    const [adminGroups] = await db.query(
      `SELECT g.group_id, g.group_name FROM Groups g JOIN GroupMembers gm ON g.group_id = gm.group_id WHERE gm.user_id = ? AND gm.role = 'admin'`,
      [userId]
    )
    if (adminGroups.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Cannot delete account. You are an admin of one or more groups. Please transfer admin role or delete the groups first.',
        admin_groups: adminGroups.map(g => ({ id: g.group_id, name: g.group_name }))
      })
    }
    await db.query('DELETE FROM Users WHERE user_id = ?', [userId])
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
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification
}
