const express = require("express");
const authorize = require('../middlewares/auth');
const controller = require('../controllers/notification.controller');

const router = express.Router();

router.route('/').get(authorize,controller.getAllNotifications);

router.route('/read').patch(authorize,controller.readNotification);

router.route('/:id').delete(authorize,controller.deleteNotification);

module.exports = router;
