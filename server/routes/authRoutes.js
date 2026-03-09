const router = require('express').Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { profileUpload } = require('../middleware/upload');

router.post('/register', profileUpload.single('profilePicture'), register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
