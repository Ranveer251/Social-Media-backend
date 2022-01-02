const {sign, verify} = require('jsonwebtoken');
const {jwtSecret} = require('../../../config/vars');

module.exports = {
    jwtSecret,
    sign,
    verify
};