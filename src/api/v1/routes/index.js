const express = require('express');
const authRoutes = require('./auth.route');
const userRoutes = require('./user.route');
const friendRoute = require('./friend.route');
const postRoutes = require('./post.route');
const feedRoutes = require('./feed.route');
const notificationRoutes = require('./notification.route');
const commentRoutes = require('./comment.route');

const router = express.Router();

router.get('/ping', (req, res) => res.send('OK'));

router.use('/auth', authRoutes);
router.use('/users',userRoutes);
router.use('/friends',friendRoute);
router.use('/posts',postRoutes);
router.use('/posts/:id/comments',commentRoutes);
router.use('/feed',feedRoutes);
router.use('/notifications',notificationRoutes);

module.exports = router;
