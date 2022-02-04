const express = require("express")
const authorize = require('../middlewares/auth');
const {validate} = require('express-validation');
const controller = require('../controllers/post.controller');
const {postBody} = require('../validations/post.validation');
const {commentBody} = require('../validations/comment.validation');

const router = express.Router();

router.route('/').post(authorize,validate(postBody),controller.createOrSharePost);
router.route('/').get(authorize,controller.getAllPosts);
router.route('/:id/like').post(authorize,controller.likePost);
router.route('/:id/unlike').post(authorize,controller.unlikePost);
router.route('/:id/likes').get(authorize,controller.getAllLikes);  //All userIds nad usernames who liked the post
router.route('/:id/comments').post(authorize,validate(commentBody),controller.postComment);
router.route('/:id/comments').get(authorize,controller.getComments);
router.route('/:id/comments/:cid/reply').get(authorize,controller.getReplies);
router.route('/:id/comments/:cid/reply').post(authorize,validate(commentBody),controller.replyComment);
router.route('/:id/comments/:cid').get(authorize,controller.getComment);
router.route('/:id/comments/:cid').patch(authorize,validate(commentBody),controller.editComment);
router.route('/:id/comments/:cid').delete(authorize,controller.deleteComment);
router.route('/:id').get(authorize,controller.getPost);
router.route('/:id').put(authorize,validate(postBody),controller.editPost);
router.route('/:id').delete(authorize,controller.deletePost);

module.exports = router;