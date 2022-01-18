const express = require('express')
const {validate} = require('express-validation')
const controller = require("../controllers/user.controller");
const authorize = require('../middlewares/auth');
const {
    userProfile,
    search
} = require('../validations/user.validation');

const router = express.Router();

router.route('/').get(authorize,validate(search),controller.getUsers);

router.route('/images').patch(authorize,controller.uploadProfilePic,controller.editProfile);

router.route('/friends').get(authorize,controller.getAllFriends);

router.route('/friends/request').post(authorize,controller.sendFriendRequest);

router.route('/friends').post(authorize,controller.acceptFriendRequest);

router.route('/friends/reject').delete(authorize,controller.rejectFriendRequest);

router.route('/friends/requests').get(authorize,controller.getAllFriendRequests);

router.route('/friends').delete(authorize,controller.removeFriend);

router.route('/block').post(authorize,controller.blockUser);

router.route('/block').get(authorize,controller.getAllBlockedUsers);

router.route('/block').delete(authorize,controller.unblockUser);

router.route('/friends/suggestions').get(authorize,controller.suggestFriends);

router.route('/:id').get(authorize,controller.getProfile);

router.route('/:id').patch(authorize,validate(userProfile),controller.editProfile);

module.exports = router;