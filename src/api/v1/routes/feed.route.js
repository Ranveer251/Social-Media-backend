const express = require('express');
const {validate} = require('express-validation');
const authorize = require('../middlewares/auth');
const controller = require('../controllers/feed.controller');

const router = express.Router();

router.route('/').get(authorize,controller.getFeed);

module.exports = router;