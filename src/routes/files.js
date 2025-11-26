const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeGroupMember } = require('../middleware/auth');
const { upload } = require('../middleware/upload'); 
const {
  uploadFile,
  getGroupFiles,
  downloadFile,
  deleteFile,
} = require('../controllers/fileController');

router.post(
  '/groups/:id/files/upload',
  authenticateToken,
  authorizeGroupMember,
  upload.single('file'), 
  uploadFile
);

router.get('/groups/:id/files', authenticateToken, authorizeGroupMember, getGroupFiles);
router.get('/:file_id/download', authenticateToken, downloadFile);
router.delete('/:file_id', authenticateToken, deleteFile);

module.exports = router;
