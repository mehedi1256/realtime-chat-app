const express = require('express');
const { protect } = require('../middleware/auth');
const { getGroupMessages } = require('../controllers/groupMessageController');

const router = express.Router();

router.use(protect);
router.get('/:groupId/messages', getGroupMessages);

module.exports = router;
