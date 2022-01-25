const express = require("express")
const authorize = require('../middlewares/auth');
const controller = require('../controllers/post.controller');

const router = express.Router();

router.route('/').post(authorize,controller.createOrSharePost);
router.route('/').get(authorize,controller.getAllPosts);
router.route('/:id').get(authorize,controller.getPost);
router.route('/:id').patch(authorize,controller.editPost);
router.route('/:id').delete(authorize,controller.deletePost);

module.exports = router;