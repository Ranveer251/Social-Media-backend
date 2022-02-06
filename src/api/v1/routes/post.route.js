const express = require("express")
const authorize = require('../middlewares/auth');
const {validate} = require('express-validation');
const controller = require('../controllers/post.controller');
const {postBody} = require('../validations/post.validation');

const router = express.Router();

router.route('/').post(authorize,validate(postBody),controller.createOrSharePost);

router.route('/').get(authorize,controller.getAllPosts);

router.route('/mentions').get(authorize,controller.getAllMentions);

router.route('/:id/like').post(authorize,controller.likePost);

router.route('/:id/unlike').post(authorize,controller.unlikePost);

router.route('/:id/likes').get(authorize,controller.getAllLikes);  //All userIds nad usernames who liked the post

router.route('/:id/insights').get(authorize,controller.getPostInsights);

router.route('/:id').get(authorize,controller.getPost);

router.route('/:id').put(authorize,validate(postBody),controller.editPost);

router.route('/:id').delete(authorize,controller.deletePost);

module.exports = router;