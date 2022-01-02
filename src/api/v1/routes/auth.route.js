const express = require("express");
const {validate} = require('express-validation');
const authorize = require('../middlewares/auth')
const controller = require("../controllers/auth.controller")
const {
    login,
    register,
    refresh,
    emailVerification,
    passwordReset,
    forgotPassword,
    changePasswordRequest,
} = require('../validations/auth.validation');

const router = express.Router();

router.route('/register').post(validate(register), controller.register);

router.route('/requestEmailVerification').post(validate(emailVerification),controller.sendVerificationEmail);

router.route('/verify/:id/:token').get(controller.verifyEmail);

router.route('/login').post(validate(login), controller.login);

router.route('/requestChangePassword').post(authorize,validate(changePasswordRequest),controller.requestChangePassword);

router.route('/requestForgotPassword').post(validate(forgotPassword),controller.forgotPassword);

router.route("/resetPassword/:token").post(validate(passwordReset),controller.changePassword);

router.route('/refreshAccess').post(validate(refresh), controller.refresh);

module.exports = router;
