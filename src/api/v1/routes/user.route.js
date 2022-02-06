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

router.route('/block').post(authorize,controller.blockUser);

router.route('/block').get(authorize,controller.getAllBlockedUsers);

router.route('/block').delete(authorize,controller.unblockUser);

router.route('/:id').get(authorize,controller.getProfile);

router.route('/:id').patch(authorize,validate(userProfile),controller.editProfile);

router.route("/:id/insights").get(authorize,controller.getUserInsights);

module.exports = router;