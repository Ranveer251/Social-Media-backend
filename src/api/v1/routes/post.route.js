const express = require("express")
const authorize = require('../middlewares/auth');
const controller = require('../controllers/post.controller');

const router = express.Router();

router.route('/').post(authorize,controller.createOrSharePost);
router.route('/').get(authorize,controller.getAllPosts);
router.route('/:id/like').post(authorize,controller.likePost);
router.route('/:id/unlike').post(authorize,controller.unlikePost);
router.route('/:id/likes').get(authorize,controller.getAllLikes);  //All userIds nad usernames who liked the post
router.route('/:id/comments').post(authorize,controller.postComment);
router.route('/:id/comments').get(authorize,controller.getAllComments);
router.route('/:id/comments/:cid/reply').post(authorize,controller.replyComment);
router.route('/:id/comments/:cid').patch(authorize,controller.editComment);
router.route('/:id/comments/:cid').delete(authorize,controller.deleteComment);
router.route('/:id').get(authorize,controller.getPost);
router.route('/:id').put(authorize,controller.editPost);
router.route('/:id').delete(authorize,controller.deletePost);

module.exports = router;