const express = require("express")
const authorize = require('../middlewares/auth');
const {validate} = require('express-validation');
const controller = require('../controllers/comment.controller');
const {commentBody} = require('../validations/comment.validation');

const router = express.Router();

router.route('/').post(authorize,validate(commentBody),controller.postComment);

router.route('/').get(authorize,controller.getComments);

router.route('/:cid/reply').get(authorize,controller.getReplies);

router.route('/:cid/reply').post(authorize,validate(commentBody),controller.replyComment);

router.route('/:cid').get(authorize,controller.getComment);

router.route('/:cid').patch(authorize,validate(commentBody),controller.editComment);

router.route('/:cid').delete(authorize,controller.deleteComment);

module.exports = router;
