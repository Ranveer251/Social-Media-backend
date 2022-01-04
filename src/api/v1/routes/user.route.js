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

router.route('/friends').get(authorize,controller.getFriends);

router.route('/friends/request').post(authorize,controller.sendFriendRequest);

router.route('/friends').post(authorize,controller.acceptFriendRequest);

router.route('/friends/reject').post(authorize,controller.rejectFriendRequest);

router.route('/:id').get(authorize,controller.getProfile);

router.route('/:id').patch(authorize,validate(userProfile),controller.editProfile);

module.exports = router;