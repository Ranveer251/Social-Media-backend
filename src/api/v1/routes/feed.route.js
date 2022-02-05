const express = require('express');
const authorize = require('../middlewares/auth');
const controller = require('../controllers/feed.controller');

const router = express.Router();

router.route('/').get(authorize,controller.getFeed);

router.route('/suggested').get(authorize,controller.getSuggestedFeed);

module.exports = router;