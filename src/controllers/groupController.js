const path = require('path');
const fs = require('fs');

const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');

const { sendGroupInviteEmail } = require('../services/emailService');
const { createNotification } = require('./notificationController');
const { HTTP_STATUS } = require('../config/constants');
const { logger } = require('../utils/logger');
const db = require('../config/database');

const uploadDir = process.env.UPLOAD_PATH || './uploads';

const createGroup = async (req, res, next) => {
  try {
    const { group_name, description, expiry_time, access_type } = req.body;
    const createdBy = req.user.user_id;

    const expiryDate = new Date(expiry_time);
    if (expiryDate <= new Date()) {
      return res.status(400).json({ error: 'Expiry time must be in the future' });
    }

    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    if (expiryDate > oneYear) {
      return res.status(400).json({ error: 'Expiry time cannot exceed 1 year' });
    }

    const groupImage = req.file ? req.file.filename : null;

    const groupId = await Group.create({
      group_name: group_name.trim(),
      description: description ? description.trim() : null,
      created_by: createdBy,
      expiry_time,
      access_type: access_type || 'public',
      group_image: groupImage
    });

    await GroupMember.add(groupId, createdBy, 'admin');

    const group = await Group.findById(groupId);

    res.status(201).json({ message: 'Group created successfully', group });
  } catch (error) {
    next(error);
  }
};

const getUserGroups = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const groups = await Group.findByUserId(userId);
    res.status(HTTP_STATUS.OK).json({ groups, count: groups.length });
  } catch (error) {
    logger.error('Get user groups error:', error);
    next(error);
  }
};

const getGroupDetails = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Group not found' });
    }

    const stats = await Group.getGroupStats(groupId);
    const role = await GroupMember.getRole(groupId, req.user.user_id);

    res.status(HTTP_STATUS.OK).json({
      group: { ...group, statistics: stats, user_role: role }
    });
  } catch (error) {
    logger.error('Get group details error:', error);
    next(error);
  }
};

const extendGroupExpiry = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { new_expiry_time } = req.body;

    const newExpiry = new Date(new_expiry_time);

    if (newExpiry <= new Date()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'New expiry time must be in the future'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Group not found' });
    }

    if (newExpiry <= new Date(group.expiry_time)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'New expiry must be after current expiry'
      });
    }

    await Group.extendExpiry(groupId, new_expiry_time);

    const members = await GroupMember.getMembers(groupId);
    for (const member of members) {
      await createNotification(
        member.user_id,
        groupId,
        `Group "${group.group_name}" expiry extended to ${newExpiry.toLocaleDateString()}`,
        'in_app'
      );
    }

    logger.info(`Group ${groupId} expiry extended by ${req.user.email}`);

    res.status(HTTP_STATUS.OK).json({
      message: 'Group expiry extended successfully',
      new_expiry_time
    });
  } catch (error) {
    logger.error('Extend group expiry error:', error);
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Group not found' });
    }

    if (group.group_image) {
      const imagePath = path.join(uploadDir, group.group_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Group image deleted:', group.group_image);
      }
    }

    await Group.delete(groupId);

    logger.info(`Group deleted: ${groupId} by ${req.user.email}`);

    res.status(HTTP_STATUS.OK).json({ message: 'Group deleted successfully' });
  } catch (error) {
    logger.error('Delete group error:', error);
    next(error);
  }
};

const inviteToGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    const isMember = await GroupMember.isMember(groupId, user.user_id);
    if (isMember) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: 'User already a member' });
    }

    const inviterRole = await GroupMember.getRole(groupId, req.user.user_id);
    if (!['admin', 'moderator'].includes(inviterRole)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Only admins/moderators can invite'
      });
    }

    await GroupMember.add(groupId, user.user_id, 'member');
    await sendGroupInviteEmail(email, groupId);

    res.status(HTTP_STATUS.OK).json({ message: 'User invited successfully' });
  } catch (error) {
    logger.error('Invite user error:', error);
    next(error);
  }
};

const getGroupMembers = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const members = await GroupMember.getMembers(groupId);
    res.status(HTTP_STATUS.OK).json({ members });
  } catch (error) {
    logger.error('Get group members error:', error);
    next(error);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { user_id, role } = req.body;

    await GroupMember.updateRole(groupId, user_id, role);

    res.status(HTTP_STATUS.OK).json({
      message: 'Member role updated successfully'
    });
  } catch (error) {
    logger.error('Update member role error:', error);
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.user_id;

    await GroupMember.remove(groupId, userId);

    res.status(HTTP_STATUS.OK).json({ message: 'Left group successfully' });
  } catch (error) {
    logger.error('Leave group error:', error);
    next(error);
  }
};

const joinPublicGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.user.user_id;

    const [rows] = await db.query(
      'SELECT access_type, expiry_time FROM chat_groups WHERE group_id = ?',
      [groupId]
    );
    if (rows.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Group not found' });
    }

    const group = rows[0];

    if (group.access_type !== 'public') {
      return res
        .status(HTTP_STATUS.FORBIDDEN)
        .json({ error: 'Only public groups can be joined directly' });
    }

    if (new Date(group.expiry_time) <= new Date()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ error: 'Group has expired' });
    }

    const [existing] = await db.query(
      'SELECT id FROM groupmembers WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (existing.length > 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ error: 'You are already a member of this group' });
    }

    await db.query(
      'INSERT INTO groupmembers (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, userId, 'member']
    );

    res.status(HTTP_STATUS.OK).json({ message: 'Joined group successfully' });
  } catch (error) {
    logger.error('Join public group error:', error);
    next(error);
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetails,
  extendGroupExpiry,
  deleteGroup,
  inviteToGroup,
  getGroupMembers,
  updateMemberRole,
  leaveGroup,
  joinPublicGroup
};
