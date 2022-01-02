const {Joi} = require('express-validation');

const register = {
    body: Joi.object({
        email: Joi.string()
            .email()
            .required(),
        passwordHash: Joi.string()
            .required()
            .min(6)
            .max(128),
        userName: Joi.string().required()
    }),
}

const login = {
    body: Joi.object({
        email: Joi.string()
        .email()
        .required(),
       passwordHash: Joi.string()
        .required()
        .min(6)
        .max(128),
    }),
}

const changePasswordRequest = {
    body: Joi.object({
        email: Joi.string().email().required(),
        passwordHash: Joi.string().required().min(6).max(128)
    })
}

const emailVerification = {
    body: Joi.object({
        email: Joi.string().email().required()
    })
}

const forgotPassword = {
    body: Joi.object({
        email: Joi.string().email().required()
    })
}

const passwordReset = {
    body: Joi.object({
        email: Joi.string().email().required(),
        newPassword: Joi.string().required().min(6).max(128)
    })
}

const refresh = {
    body: Joi.object({
        email: Joi.string().email().required(),
        refreshToken: Joi.string()
    })
}


module.exports = {
    register,
    login,
    changePasswordRequest,
    emailVerification,
    forgotPassword, 
    passwordReset,
    refresh
}