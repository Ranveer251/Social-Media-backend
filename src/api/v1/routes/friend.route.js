const express = require('express')
const {validate} = require('express-validation')
const controller = require("../controllers/friend.controller");
const authorize = require('../middlewares/auth');

const router = express.Router();

router.route('/').get(authorize,controller.getAllFriends);

router.route('/').post(authorize,controller.acceptFriendRequest);

router.route('/').delete(authorize,controller.removeFriend);

router.route('/requests').get(authorize,controller.getAllFriendRequests);

router.route('/request').post(authorize,controller.sendFriendRequest);

router.route('/reject').delete(authorize,controller.rejectFriendRequest);

router.route('/suggestions').get(authorize,controller.suggestFriends);

module.exports = router;