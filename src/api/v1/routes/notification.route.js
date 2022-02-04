const express = require("express");
const authorize = require('../middlewares/auth');
const controller = require('../controllers/notification.controller');

const router = express.Router();

router.route('/').getAllNotifications(authorize,controller.getAllNotifications);
router.route('/read').patch(authorize,controller.readNotification);
router.route('/:id').deleteNotification(authorize,controller.deleteNotification);

module.exports = router;
