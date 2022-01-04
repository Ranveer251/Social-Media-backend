const {Joi} = require('express-validation');

const userProfile = {
    body: Joi.object({
        email: Joi.string().email(),
        passwordHash: Joi.string().min(6).max(128),
        userName: Joi.string(),
        name: Joi.string().max(128),
        profilePic: Joi.string()
    })
}

const search = {
    body: Joi.object({
        searchString: Joi.string()
    })
}

module.exports = {
    userProfile,
    search
}