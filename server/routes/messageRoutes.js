const router = require('express').Router();
const {
  getMessages,
  markSeen,
  editMessage,
  deleteMessage,
  reactToMessage,
  uploadFile,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(protect);

router.get('/:userId', getMessages);
router.put('/:userId/seen', markSeen);
router.put('/:id/edit', editMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/react', reactToMessage);
router.post('/upload/file', upload.single('file'), uploadFile);

module.exports = router;
