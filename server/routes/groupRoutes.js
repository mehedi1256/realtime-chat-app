const express = require('express');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  createGroup,
  getMyGroups,
  getGroupById,
  addMembers,
  removeMember,
  leaveGroup,
  updateGroup,
} = require('../controllers/groupController');

const router = express.Router();

router.use(protect);

router.post('/', upload.single('groupAvatar'), createGroup);
router.get('/', getMyGroups);
router.get('/:groupId', getGroupById);
router.put('/:groupId', upload.single('groupAvatar'), updateGroup);
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:userId', removeMember);
router.post('/:groupId/leave', leaveGroup);

module.exports = router;
