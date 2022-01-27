const express = require('express');
const authRoutes = require('./auth.route');
const userRoutes = require('./user.route');
const postRoutes = require('./post.route');
const feedRoutes = require('./feed.route');

const router = express.Router();

router.get('/ping', (req, res) => res.send('OK'));

router.use('/auth', authRoutes);
router.use('/users',userRoutes);
router.use('/posts',postRoutes);
router.use('/feed',feedRoutes);


module.exports = router;
