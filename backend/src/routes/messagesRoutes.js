const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/messagesController');

const router = express.Router();

router.use(requireAuth);

router.get('/conversations', ctrl.getConversations);
router.get('/conversations/:otherUserId', ctrl.getConversation);
router.post('/', ctrl.sendMessage);
router.get('/admins', ctrl.getAdmins);
router.get('/contacts', ctrl.getContacts);

module.exports = router;
