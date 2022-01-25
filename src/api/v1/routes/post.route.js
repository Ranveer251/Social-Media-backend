const express = require("express")
const authorize = require('../middlewares/auth');
const controller = require('../controllers/post.controller');

const router = express.Router();

router.route('/').post(authorize,controller.createOrSharePost);
router.route('/').get(authorize,controller.getAllPosts);
router.route('/:id/like').post(authorize,controller.likePost);
router.route('/:id/unlike').post(authorize,controller.unlikePost);
router.route('/:id/likes').get(authorize,controller.getAllLikes);  //All userIds nad usernames who liked the post
router.route('/:id').get(authorize,controller.getPost);
router.route('/:id').patch(authorize,controller.editPost);
router.route('/:id').delete(authorize,controller.deletePost);

module.exports = router;